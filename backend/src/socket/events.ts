/**
 * Socket.io event documentation (Phase 2)
 *
 * Client → Server
 *   join-room            { roomId }
 *   leave-room           { roomId }
 *   code-change          { roomId, code }
 *   language-change      { roomId, language }
 *   theme-change         { roomId, theme }
 *   cursor-update        { roomId, position, color }  // throttled on client
 *   cursor-move          { roomId, position, color }  // legacy alias
 *   chat-message         { roomId, content, messageType? }
 *   typing-start         { roomId }
 *   typing-stop          { roomId }
 *   draw-start           { roomId, stroke }
 *   draw-update          { roomId, strokeId, points }
 *   draw-end             { roomId, stroke }
 *   canvas-clear         { roomId }
 *   undo                 { roomId }
 *   redo                 { roomId }
 *   room-settings-update { roomId, settings }
 *   room-lock / room-unlock
 *   remove-participant   { roomId, targetUserId }
 *   transfer-host        { roomId, targetUserId }
 *   voice-join           { roomId }
 *   voice-leave          { roomId }
 *   voice-state          { roomId, speaking, micOn }
 *   presence-update      { roomId, presence }
 *   screen-share-start   { roomId }
 *   screen-share-stop    { roomId }
 *   webrtc-offer/answer/ice  WebRTC signaling (kind: voice|screen)
 *
 * Server → Client
 *   sync-state           full room snapshot on join/reconnect
 *   sync-code            code + meta (compat)
 *   code-change
 *   language-change
 *   theme-change
 *   cursor-update
 *   chat-message
 *   participant-joined / participant-left
 *   user-joined / user-left (compat)
 *   typing-start / typing-stop
 *   draw-start / draw-update / draw-end
 *   canvas-clear / undo / redo
 *   whiteboard-sync      { strokes }
 *   room-locked / room-unlocked
 *   room-settings-update
 *   host-changed
 *   presence             { type, username } toast payloads
 *   voice-joined         { userId, username }
 *   voice-left           { userId, username? }
 *   voice-peers          { peers }
 *   voice-ready          { userId, username }
 *   voice-state          { userId, speaking, micOn, participants? }
 *   screen-share-start   { userId, username }
 *   screen-share-stop    { userId, username? }
 *   presence-update      { userId, username, presence }
 *   notification         { type, message }
 *   friend-request       { friendshipId, from }
 *   friend-accepted      { friendshipId, from }
 *   user-online          { userId, username }
 *   user-offline         { userId, username }
 */

export type WhiteboardStroke = {
  id: string;
  tool: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
  userId: string;
};

export type RoomRuntimeState = {
  strokes: WhiteboardStroke[];
  undone: WhiteboardStroke[];
  typingUsers: Map<string, string>;
};

export const roomRuntime = new Map<string, RoomRuntimeState>();

export function getOrCreateRuntime(roomId: string): RoomRuntimeState {
  let state = roomRuntime.get(roomId);
  if (!state) {
    state = { strokes: [], undone: [], typingUsers: new Map() };
    roomRuntime.set(roomId, state);
  }
  return state;
}
