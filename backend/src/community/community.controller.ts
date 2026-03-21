import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@Controller('community')
@UseGuards(SupabaseJwtGuard)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ─── Teacher: Manage own posts ────────────────────────────────────────────

  @Post('posts')
  createPost(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(req.user.id, dto);
  }

  @Delete('posts/:id')
  deletePost(@Req() req: any, @Param('id') id: string) {
    return this.communityService.deletePost(req.user.id, id);
  }

  @Get('my-posts')
  getMyPosts(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getMyPosts(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 12,
    );
  }

  // ─── Social: Follow ───────────────────────────────────────────────────────

  @Post('follow/:teacherId')
  toggleFollow(@Req() req: any, @Param('teacherId') teacherId: string) {
    return this.communityService.toggleFollow(req.user.id, teacherId);
  }

  // ─── Feed / Clips / Explore ───────────────────────────────────────────────

  @Get('feed')
  getFeed(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getFeed(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('clips')
  getClips(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getClips(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('explore')
  exploreTeachers(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.communityService.exploreTeachers(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  // ─── Likes on Posts ───────────────────────────────────────────────────────

  @Post('posts/:id/like')
  togglePostLike(@Req() req: any, @Param('id') id: string) {
    return this.communityService.togglePostLike(req.user.id, id);
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  @Get('posts/:id/comments')
  getPostComments(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getPostComments(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      req.user.id,
    );
  }

  @Post('posts/:id/comments')
  createComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(req.user.id, id, dto);
  }

  @Delete('comments/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.communityService.deleteComment(req.user.id, commentId);
  }

  @Post('comments/:commentId/like')
  toggleCommentLike(@Req() req: any, @Param('commentId') commentId: string) {
    return this.communityService.toggleCommentLike(req.user.id, commentId);
  }

  // ─── Teacher Public Page ──────────────────────────────────────────────────

  @Get('teachers/:teacherId/profile')
  getTeacherProfile(@Req() req: any, @Param('teacherId') teacherId: string) {
    return this.communityService.getTeacherProfile(req.user.id, teacherId);
  }

  @Get('teachers/:teacherId/areas')
  getTeacherPublicAreas(
    @Param('teacherId') teacherId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getTeacherPublicAreas(
      teacherId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 12,
    );
  }

  @Get('teachers/:teacherId/posts')
  getTeacherPosts(
    @Req() req: any,
    @Param('teacherId') teacherId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getTeacherPosts(
      req.user.id,
      teacherId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 12,
    );
  }
}
