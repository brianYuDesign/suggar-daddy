/**
 * 聊天室管理控制器
 * 僅限 SUPER_ADMIN 角色存取
 * 提供查看所有用戶聊天室和訊息的功能
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { PermissionRole } from '@suggar-daddy/common';
import { ChatManagementService } from './chat-management.service';

@Controller('chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PermissionRole.SUPER_ADMIN)
export class ChatManagementController {
  constructor(private readonly chatManagementService: ChatManagementService) {}

  /**
   * GET /api/admin/chats
   * 列出所有聊天室（分頁）
   */
  @Get()
  listAllConversations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.chatManagementService.listAllConversations(page, limit, search);
  }

  /**
   * GET /api/admin/chats/stats
   * 取得聊天統計資料
   */
  @Get('stats')
  getChatStats() {
    return this.chatManagementService.getChatStats();
  }

  /**
   * GET /api/admin/chats/user/:userId
   * 查看指定用戶的所有聊天室
   */
  @Get('user/:userId')
  getUserConversations(@Param('userId') userId: string) {
    return this.chatManagementService.getUserConversations(userId);
  }

  /**
   * GET /api/admin/chats/:conversationId/messages
   * 查看特定聊天室的訊息內容
   */
  @Get(':conversationId/messages')
  getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatManagementService.getConversationMessages(conversationId, page, limit);
  }
}
