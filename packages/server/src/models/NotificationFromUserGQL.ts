import { Field, ObjectType, Int } from 'decapi'
import { UserGQL } from './UserGQL'

@ObjectType()
export class NotificationFromUserGQLScalars {
  @Field({ type: Int })
  id: number

  @Field({ type: Int })
  userId: number

  @Field({ type: Int })
  userWhoFiredId: number
}

@ObjectType()
export class NotificationFromUserGQL extends NotificationFromUserGQLScalars {
  @Field()
  user: UserGQL

  @Field()
  userWhoFired: UserGQL

  // skip overwrite 👇
}
