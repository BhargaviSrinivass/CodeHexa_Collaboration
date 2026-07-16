import { useParams } from "react-router-dom";
import { RoomPage } from "../pages/RoomPage";

export function RoomPageWrapper() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <RoomPage roomId={id} />;
}
