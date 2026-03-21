import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly supabaseService: SupabaseService) { }

  private supabase() {
    return this.supabaseService.getClient();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private paginate(page: number, limit: number) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    return { from, to };
  }

  /** Enriches posts with author profile, media, like count, comment count, liked_by_me */
  private async enrichPosts(posts: any[], userId: string) {
    if (!posts.length) return [];

    const postIds = posts.map((p) => p.id);
    const teacherIds = [...new Set(posts.map((p) => p.teacher_id))];

    const [profilesRes, mediaRes, likesCountRes, commentsCountRes, myLikesRes] =
      await Promise.all([
        this.supabase()
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .in('id', teacherIds),
        this.supabase()
          .from('community_post_media')
          .select('*')
          .in('post_id', postIds)
          .order('order_index'),
        this.supabase()
          .from('community_post_likes')
          .select('post_id')
          .in('post_id', postIds),
        this.supabase()
          .from('community_post_comments')
          .select('post_id')
          .in('post_id', postIds)
          .is('parent_id', null),
        this.supabase()
          .from('community_post_likes')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', userId),
      ]);

    const profiles = profilesRes.data ?? [];
    const media = mediaRes.data ?? [];
    const allLikes = likesCountRes.data ?? [];
    const allComments = commentsCountRes.data ?? [];
    const myLikes = new Set((myLikesRes.data ?? []).map((l: any) => l.post_id));

    return posts.map((post) => {
      const author = profiles.find((p: any) => p.id === post.teacher_id);
      const postMedia = media.filter((m: any) => m.post_id === post.id);
      const likeCount = allLikes.filter((l: any) => l.post_id === post.id).length;
      const commentCount = allComments.filter((c: any) => c.post_id === post.id).length;
      return {
        ...post,
        author,
        media: postMedia,
        like_count: likeCount,
        comment_count: commentCount,
        liked_by_me: myLikes.has(post.id),
      };
    });
  }

  // ─── Teacher: Create / Delete Post ───────────────────────────────────────

  async createPost(userId: string, dto: CreatePostDto) {
    const { data: post, error } = await this.supabase()
      .from('community_posts')
      .insert({ teacher_id: userId, type: dto.type, caption: dto.caption ?? null })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    if (dto.media?.length) {
      const mediaRows = dto.media.map((m, i) => ({
        post_id: post.id,
        type: m.type,
        url: m.url,
        order_index: i,
      }));
      const { error: mediaErr } = await this.supabase()
        .from('community_post_media')
        .insert(mediaRows);
      if (mediaErr) throw new BadRequestException(mediaErr.message);
    }

    const enriched = await this.enrichPosts([post], userId);
    return enriched[0];
  }

  async deletePost(userId: string, postId: string) {
    const { data: post } = await this.supabase()
      .from('community_posts')
      .select('teacher_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) throw new NotFoundException('Post não encontrado.');
    if (post.teacher_id !== userId) throw new ForbiddenException('Sem permissão.');

    const { error } = await this.supabase()
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async getMyPosts(userId: string, page: number, limit: number) {
    const { from, to } = this.paginate(page, limit);
    const { data, error, count } = await this.supabase()
      .from('community_posts')
      .select('*', { count: 'exact' })
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);
    const enriched = await this.enrichPosts(data ?? [], userId);
    return { data: enriched, meta: { total: count ?? 0, page, limit } };
  }

  // ─── Social: Follow / Unfollow ────────────────────────────────────────────

  async toggleFollow(userId: string, teacherId: string) {
    if (userId === teacherId) throw new BadRequestException('Você não pode seguir a si mesmo.');

    const { data: existing } = await this.supabase()
      .from('teacher_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (existing) {
      await this.supabase()
        .from('teacher_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('teacher_id', teacherId);
      return { following: false };
    } else {
      await this.supabase()
        .from('teacher_follows')
        .insert({ follower_id: userId, teacher_id: teacherId });
      return { following: true };
    }
  }

  async isFollowing(userId: string, teacherId: string): Promise<boolean> {
    const { data } = await this.supabase()
      .from('teacher_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('teacher_id', teacherId)
      .maybeSingle();
    return !!data;
  }

  // ─── Feed & Explore ───────────────────────────────────────────────────────

  async getFeed(userId: string, page: number, limit: number) {
    const { from, to } = this.paginate(page, limit);

    const { data: follows } = await this.supabase()
      .from('teacher_follows')
      .select('teacher_id')
      .eq('follower_id', userId);

    const teacherIds = (follows ?? []).map((f: any) => f.teacher_id);
    if (!teacherIds.length) return { data: [], meta: { total: 0, page, limit } };

    const { data, error, count } = await this.supabase()
      .from('community_posts')
      .select('*', { count: 'exact' })
      .in('teacher_id', teacherIds)
      .in('type', ['text', 'photo', 'video'])
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);
    const enriched = await this.enrichPosts(data ?? [], userId);
    return { data: enriched, meta: { total: count ?? 0, page, limit } };
  }

  async getClips(userId: string, page: number, limit: number) {
    const { from, to } = this.paginate(page, limit);

    const { data: follows } = await this.supabase()
      .from('teacher_follows')
      .select('teacher_id')
      .eq('follower_id', userId);

    const teacherIds = (follows ?? []).map((f: any) => f.teacher_id);
    if (!teacherIds.length) return { data: [], meta: { total: 0, page, limit } };

    const { data, error, count } = await this.supabase()
      .from('community_posts')
      .select('*', { count: 'exact' })
      .in('teacher_id', teacherIds)
      .eq('type', 'clip')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);
    const enriched = await this.enrichPosts(data ?? [], userId);
    return { data: enriched, meta: { total: count ?? 0, page, limit } };
  }

  async exploreTeachers(userId: string, page: number, limit: number, search?: string) {
    const { from, to } = this.paginate(page, limit);

    let query = this.supabase()
      .from('profiles')
      .select('id, full_name, avatar_url, banner_url', { count: 'exact' })
      .eq('role', 'teacher');

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new BadRequestException(error.message);

    const teachers = data ?? [];
    if (!teachers.length) return { data: [], meta: { total: 0, page, limit } };

    const teacherIds = teachers.map((t: any) => t.id);

    const [followsRes, areasRes] = await Promise.all([
      this.supabase()
        .from('teacher_follows')
        .select('teacher_id')
        .eq('follower_id', userId)
        .in('teacher_id', teacherIds),
      this.supabase()
        .from('teacher_areas')
        .select('teacher_id')
        .in('teacher_id', teacherIds)
        .eq('is_private', false),
    ]);

    const followedSet = new Set((followsRes.data ?? []).map((f: any) => f.teacher_id));
    const areaCountMap: Record<string, number> = {};
    for (const a of areasRes.data ?? []) {
      areaCountMap[a.teacher_id] = (areaCountMap[a.teacher_id] ?? 0) + 1;
    }

    const enriched = teachers.map((t: any) => ({
      ...t,
      is_following: followedSet.has(t.id),
      area_count: areaCountMap[t.id] ?? 0,
    }));

    return { data: enriched, meta: { total: count ?? 0, page, limit } };
  }

  // ─── Likes on Posts ───────────────────────────────────────────────────────

  async togglePostLike(userId: string, postId: string) {
    const { data: existing } = await this.supabase()
      .from('community_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await this.supabase()
        .from('community_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      return { liked: false };
    } else {
      await this.supabase()
        .from('community_post_likes')
        .insert({ post_id: postId, user_id: userId });
      return { liked: true };
    }
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async getPostComments(postId: string, page: number, limit: number, userId: string) {
    const { from, to } = this.paginate(page, limit);

    const { data: comments, error, count } = await this.supabase()
      .from('community_post_comments')
      .select('*, author:profiles!user_id(id, full_name, avatar_url)', { count: 'exact' })
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    const commentIds = (comments ?? []).map((c: any) => c.id);
    if (!commentIds.length) return { data: [], meta: { total: 0, page, limit } };

    const [repliesRes, likesRes, myLikesRes] = await Promise.all([
      this.supabase()
        .from('community_post_comments')
        .select('*, author:profiles!user_id(id, full_name, avatar_url)')
        .in('parent_id', commentIds)
        .order('created_at', { ascending: true }),
      this.supabase()
        .from('community_comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds),
      this.supabase()
        .from('community_comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', userId),
    ]);

    const replies = repliesRes.data ?? [];
    const allLikes = likesRes.data ?? [];
    const myLikesSet = new Set((myLikesRes.data ?? []).map((l: any) => l.comment_id));

    const enriched = (comments ?? []).map((c: any) => ({
      ...c,
      replies: replies.filter((r: any) => r.parent_id === c.id),
      like_count: allLikes.filter((l: any) => l.comment_id === c.id).length,
      liked_by_me: myLikesSet.has(c.id),
    }));

    return { data: enriched, meta: { total: count ?? 0, page, limit } };
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const { data, error } = await this.supabase()
      .from('community_post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: dto.content,
        parent_id: dto.parent_id ?? null,
      })
      .select('*, author:profiles!user_id(id, full_name, avatar_url)')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteComment(userId: string, commentId: string) {
    const { data: comment } = await this.supabase()
      .from('community_post_comments')
      .select('user_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) throw new NotFoundException('Comentário não encontrado.');
    if (comment.user_id !== userId) throw new ForbiddenException('Sem permissão.');

    const { error } = await this.supabase()
      .from('community_post_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async toggleCommentLike(userId: string, commentId: string) {
    const { data: existing } = await this.supabase()
      .from('community_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await this.supabase()
        .from('community_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);
      return { liked: false };
    } else {
      await this.supabase()
        .from('community_comment_likes')
        .insert({ comment_id: commentId, user_id: userId });
      return { liked: true };
    }
  }

  // ─── Teacher Public Page ──────────────────────────────────────────────────

  async getTeacherProfile(viewerId: string, teacherId: string) {
    const { data: profile, error } = await this.supabase()
      .from('profiles')
      .select('id, full_name, avatar_url, banner_url, role')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .maybeSingle();

    if (error || !profile) throw new NotFoundException('Professor não encontrado.');

    const [followersRes, areasCountRes, postsCountRes, isFollowingRes] = await Promise.all([
      this.supabase()
        .from('teacher_follows')
        .select('id', { count: 'exact' })
        .eq('teacher_id', teacherId),
      this.supabase()
        .from('teacher_areas')
        .select('id', { count: 'exact' })
        .eq('teacher_id', teacherId)
        .eq('is_private', false),
      this.supabase()
        .from('community_posts')
        .select('id', { count: 'exact' })
        .eq('teacher_id', teacherId),
      viewerId !== teacherId
        ? this.supabase()
          .from('teacher_follows')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('teacher_id', teacherId)
          .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      ...profile,
      follower_count: followersRes.count ?? 0,
      area_count: areasCountRes.count ?? 0,
      post_count: postsCountRes.count ?? 0,
      is_following: !!isFollowingRes.data,
    };
  }

  async getTeacherPublicAreas(teacherId: string, page: number, limit: number) {
    const { from, to } = this.paginate(page, limit);

    const { data, error, count } = await this.supabase()
      .from('teacher_areas')
      .select('id, title, description, color_code, monthly_price, banner_url', { count: 'exact' })
      .eq('teacher_id', teacherId)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);
    return { data: data ?? [], meta: { total: count ?? 0, page, limit } };
  }

  async getTeacherPosts(viewerId: string, teacherId: string, page: number, limit: number) {
    const { from, to } = this.paginate(page, limit);

    const { data, error, count } = await this.supabase()
      .from('community_posts')
      .select('*', { count: 'exact' })
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);
    const enriched = await this.enrichPosts(data ?? [], viewerId);
    return { data: enriched, meta: { total: count ?? 0, page, limit } };
  }
}
