import { registerEnumType } from 'type-graphql'

export enum NotificationTypeGQL {
  newPosts = 'newPosts',
  newComments = 'newComments',
  newFollowers = 'newFollowers',
  reply = 'reply',
  heartOnPost = 'heartOnPost',
  heartOnComment = 'heartOnComment',
  heartOnReply = 'heartOnReply',
}
registerEnumType(NotificationTypeGQL, {
  name: 'NotificationType',
})
