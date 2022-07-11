import { Heart } from './Heart'
import { User } from './User'
import { Comment } from './Comment'
import { Field, ObjectType } from 'decapi'
import { Field, ObjectType, Int, Float } from 'decapi'

@ObjectType()
export class PostScalars {
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
export class Post extends PostScalars {
  @Field()
  hearts: Heart[]

  @Field()
  author: User

  @Field()
  comments: Comment[]

  // skip overwrite 👇
}
