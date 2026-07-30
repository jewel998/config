import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/team-utils";

interface UserAvatarProps {
  displayName: string | null;
  photoURL: string | null;
  className?: string;
}

export const UserAvatar = ({ displayName, photoURL, className }: UserAvatarProps) => (
  <Avatar className={className ?? "h-8 w-8"}>
    {photoURL && <AvatarImage src={photoURL} alt={displayName ?? ""} />}
    <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
  </Avatar>
);
