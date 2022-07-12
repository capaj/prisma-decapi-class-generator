import { Field, ObjectType, Int } from 'decapi'
import { UserGQL } from './UserGQL'
import { PostGQL } from './PostGQL'
import { CommentGQL } from './CommentGQL'

@ObjectType()
export class HeartGQLScalars {
  @Field({ type: Int })
  id: number

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class HeartGQL extends HeartGQLScalars {
  @Field()
  user: UserGQL

  @Field()
  post: PostGQL | null

  @Field()
  comment: CommentGQL | null

  // skip overwrite 👇
}
