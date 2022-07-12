import { Field, ObjectType, Int } from 'decapi'
import { UserGQL } from './UserGQL'
import { NotificationFromUserGQL } from './NotificationFromUserGQL'
import { NotificationTypeGQL } from '../types/NotificationType'

@ObjectType()
export class NotificationGQLScalars {
  @Field({ type: Int })
  id: number

  @Field()
  seen: boolean

  @Field()
  message: string

  @Field()
  type: NotificationTypeGQL

  @Field()
  url: string

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class NotificationGQL extends NotificationGQLScalars {
  @Field()
  notifiedUser: UserGQL

  @Field()
  fromUsers: NotificationFromUserGQL[]

  // skip overwrite 👇
}
