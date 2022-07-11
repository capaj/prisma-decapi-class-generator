import { Post } from './Post'
import { Comment } from './Comment'
import { Follower } from './Follower'
import { Notification } from './Notification'
import { Field, ObjectType } from 'decapi'
import { Field, ObjectType, Int } from 'decapi'

@ObjectType()
export class UserScalars {
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
export class User extends UserScalars {
  @Field()
  posts: Post[]

  @Field()
  comments: Comment[]

  @Field()
  followers: Follower[]

  @Field()
  following: Follower[]

  @Field()
  notifications: Notification[]

  // skip overwrite 👇
}
