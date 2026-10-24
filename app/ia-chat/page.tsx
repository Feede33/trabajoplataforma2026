import { AIChat } from '@/components/ai-chat/AIChat'

export const metadata = {
  title: 'IA Chat | PostulaUY',
}

export default function IAChatPage() {
  return (
    <div className="font-google-sans">
      <AIChat />
    </div>
  )
}
