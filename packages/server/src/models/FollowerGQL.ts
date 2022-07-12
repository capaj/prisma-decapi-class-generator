import { Field, ObjectType, Int } from 'decapi'
import { UserGQL } from './UserGQL'

@ObjectType()
export class FollowerGQLScalars {
  @Field({ type: Int })
  id: number

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class FollowerGQL extends FollowerGQLScalars {
  @Field()
  followed_user: UserGQL

  @Field()
  follower_user: UserGQL

  // skip overwrite 👇
}
