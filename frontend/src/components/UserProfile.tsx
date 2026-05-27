import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfileProps {
  userId: string;
  userName: string;
  status?: string;
  bio?: string;
  onClose: () => void;
  isCurrentUser?: boolean;
  avatarSrc?: string;
}

export default function UserProfile({ 
  userId, 
  userName, 
  status = 'オンライン中', 
  bio = '',
  onClose,
  isCurrentUser = false,
  avatarSrc = '/default-avatar.png'
}: UserProfileProps) {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="user-profile-panel">
      <button className="user-profile-close" onClick={onClose}>
        <X size={20} />
      </button>

      <div className="user-profile-content">
        <div className="user-profile-header">
          <div className="user-profile-banner" />
          <div className="user-profile-header-bottom">
            <div className="user-profile-avatar-wrapper">
              <Avatar className="user-profile-avatar">
                <AvatarImage src={avatarSrc} alt={userName} />
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="user-profile-status-bubble">
              <h3 className="user-profile-section-title-inline">ステータス</h3>
              <p className="user-profile-status-text">{status}</p>
            </div>
          </div>
        </div>

        <div className="user-profile-info">
          <h2 className="user-profile-name">{userName}</h2>

          {bio && (
            <div className="user-profile-section">
              <h3 className="user-profile-section-title">自己紹介</h3>
              <p className="user-profile-bio">{bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
