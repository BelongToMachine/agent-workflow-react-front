import { ActiveChatProvider } from "@/hooks/useActiveChat";
import { ChatShell } from "./shell";

export function ChatPage() {
  return (
    <ActiveChatProvider>
      <ChatShell />
    </ActiveChatProvider>
  );
}
