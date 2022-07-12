import { Field, ObjectType, Int } from 'decapi'
import { PostGQL } from './PostGQL'
import { CommentGQL } from './CommentGQL'
import { FollowerGQL } from './FollowerGQL'
import { NotificationGQL } from './NotificationGQL'

@ObjectType()
export class UserGQLScalars {
  @Field({ type: Int })
  id: number

  @Field()
  name: string

  @Field()
  username: string | null

  @Field()
  email: string

  @Field()
  bio: string | null

  @Field()
  profilePic: string | null

  @Field({ type: Int })
  followers_count: number

  @Field({ type: Int })
  following_count: number

  @Field()
  githubId: string | null

  @Field()
  lastTimelineVisit: Date | null

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class UserGQL extends UserGQLScalars {
  @Field()
  posts: PostGQL[]

  @Field()
  comments: CommentGQL[]

  @Field()
  followers: FollowerGQL[]

  @Field()
  following: FollowerGQL[]

  @Field()
  notifications: NotificationGQL[]

  // skip overwrite 👇
}
