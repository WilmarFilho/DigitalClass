import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('suggestions')
  @UseGuards(SupabaseJwtGuard)
  async getSuggestions(@Req() req: any, @Query('month') month: string) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      const d = new Date();
      month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.calendarService.getSuggestions(req.user.id, month);
  }

  @Get('events')
  @UseGuards(SupabaseJwtGuard)
  async getEvents(@Req() req: any, @Query('month') month: string) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      const d = new Date();
      month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.calendarService.getEvents(req.user.id, month);
  }

  @Post('events')
  @UseGuards(SupabaseJwtGuard)
  async create(@Req() req: any, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.create(req.user.id, dto);
  }

  @Delete('events/:id')
  @UseGuards(SupabaseJwtGuard)
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.calendarService.delete(req.user.id, id);
  }
}
