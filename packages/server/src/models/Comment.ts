import { Field, ObjectType, Int } from 'type-graphql'
import { User } from './User'
import { Post } from './Post'
import { Heart } from './Heart'
import { Field, ObjectType } from 'decapi'
import { Field, ObjectType, Int } from 'decapi'

@ObjectType()
export class CommentScalars {
  @Field({ type: Int })
  id: number

  @Field()
  text: string

  @Field({ type: Int })
  hearts_count: number

  @Field()
  parentId: string | null

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class Comment extends CommentScalars {
  @Field()
  author: User

  @Field()
  post: Post

  @Field()
  hearts: Heart[]

  // skip overwrite 👇
}
