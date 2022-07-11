
import { User } from './User'
import { NotificationFromUser } from './NotificationFromUser'
import { NotificationType } from '../types/NotificationType'

import { Field, ObjectType, Int } from 'decapi'

@ObjectType()
export class NotificationScalars {
  @Field({ type: Int })
  id: number

  @Field()
  seen: boolean

  @Field()
  message: string

  @Field()
  type: NotificationType

  @Field()
  url: string

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class Notification extends NotificationScalars {
  @Field()
  notifiedUser: User

  @Field()
  fromUsers: NotificationFromUser[]

  // skip overwrite 👇
}
