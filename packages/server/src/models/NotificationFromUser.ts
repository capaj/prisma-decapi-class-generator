import { Field, ObjectType, Int } from 'type-graphql'
import { User } from './User'
import { Field, ObjectType } from 'decapi'
import { Field, ObjectType, Int } from 'decapi'

@ObjectType()
export class NotificationFromUserScalars {
  @Field({ type: Int })
  id: number

  @Field({ type: Int })
  userId: number

  @Field({ type: Int })
  userWhoFiredId: number
}

@ObjectType()
export class NotificationFromUser extends NotificationFromUserScalars {
  @Field()
  user: User

  @Field()
  userWhoFired: User

  // skip overwrite 👇
}
