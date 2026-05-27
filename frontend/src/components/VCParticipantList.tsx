import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type User = {
  id: string
  name: string
  status: 'online' | 'offline'
}

interface VCParticipantListProps {
  participants: string[]
  users: User[]
  getInitials: (name: string) => string
  getUserAvatar: (userId: string) => string
}

export default function VCParticipantList({ participants, users, getInitials, getUserAvatar }: VCParticipantListProps) {
  if (!participants || participants.length === 0) {
    return null
  }

  return (
    <div className="vc-participants">
      {participants.map((userId) => {
        const user = users.find(u => u.id === userId)
        return user ? (
          <div key={userId} className="vc-participant">
            <Avatar className="vc-participant-avatar">
              <AvatarImage src={getUserAvatar(userId)} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="vc-participant-name">{user.name}</span>
          </div>
        ) : null
      })}
    </div>
  )
}
