import { createZodDto } from 'nestjs-zod';
import {
  ListConversationsResSchema,
  ListMessagesQuerySchema,
  ListMessagesResSchema,
  MessageResSchema,
  SendMessageBodySchema,
} from './chat.model';

export class SendMessageBodyDto extends createZodDto(SendMessageBodySchema) {}
export class MessageResDto extends createZodDto(MessageResSchema) {}
export class ListMessagesQueryDto extends createZodDto(ListMessagesQuerySchema) {}
export class ListMessagesResDto extends createZodDto(ListMessagesResSchema) {}
export class ListConversationsResDto extends createZodDto(ListConversationsResSchema) {}
