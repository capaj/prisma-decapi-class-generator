import { Field, ObjectType, Int } from 'decapi'
import { UserGQL } from './UserGQL'
import { PostGQL } from './PostGQL'
import { HeartGQL } from './HeartGQL'

@ObjectType()
export class CommentGQLScalars {
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
export class CommentGQL extends CommentGQLScalars {
  @Field()
  author: UserGQL

  @Field()
  post: PostGQL

  @Field()
  hearts: HeartGQL[]

  // skip overwrite 👇
}
