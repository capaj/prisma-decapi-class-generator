import { Field, ObjectType, Int, Float } from 'decapi'
import { HeartGQL } from './HeartGQL'
import { UserGQL } from './UserGQL'
import { CommentGQL } from './CommentGQL'

@ObjectType()
export class PostGQLScalars {
  @Field({ type: Int })
  id: number

  @Field()
  title: string

  @Field()
  body: string

  @Field()
  tags: string[]

  @Field()
  test: number[]

  @Field()
  published: boolean

  @Field({ type: Int })
  hearts_count: number

  @Field({ type: Int })
  comments_count: number

  @Field()
  readingTimeTxt: string

  @Field({ type: Float })
  readingTimeMin: number

  @Field()
  coverImg: string | null

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class PostGQL extends PostGQLScalars {
  @Field()
  hearts: HeartGQL[]

  @Field()
  author: UserGQL

  @Field()
  comments: CommentGQL[]

  // skip overwrite 👇
}
