import { User } from './User'
import { Field, ObjectType, Int } from 'decapi'

@ObjectType()
export class FollowerScalars {
  @Field({ type: Int })
  id: number

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class Follower extends FollowerScalars {
  @Field()
  followed_user: User

  @Field()
  follower_user: User

  // skip overwrite 👇
}
