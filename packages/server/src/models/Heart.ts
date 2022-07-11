import { User } from './User'
import { Post } from './Post'
import { Comment } from './Comment'
import { Field, ObjectType } from 'decapi'
import { Field, ObjectType, Int } from 'decapi'

@ObjectType()
export class HeartScalars {
  @Field({ type: Int })
  id: number

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class Heart extends HeartScalars {
  @Field()
  user: User

  @Field()
  post: Post | null

  @Field()
  comment: Comment | null

  // skip overwrite 👇
}
