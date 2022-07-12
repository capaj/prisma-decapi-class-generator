import { registerEnum } from 'decapi'

export enum NotificationTypeGQL {
  newPosts = 'newPosts',
  newComments = 'newComments',
  newFollowers = 'newFollowers',
  reply = 'reply',
  heartOnPost = 'heartOnPost',
  heartOnComment = 'heartOnComment',
  heartOnReply = 'heartOnReply',
}
registerEnum(NotificationTypeGQL, {
  name: 'NotificationType',
})
