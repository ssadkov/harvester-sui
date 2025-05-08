import React, { useRef, useEffect } from 'react';
import { SendIcon, PieChart, BarChart, LineChart } from 'lucide-react';

interface SuggestedAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
}

const quickActions: SuggestedAction[] = [
  {
    icon: <PieChart className="h-4 w-4" />,
    label: 'Show me Pie chart of my assets',
    action: () => {
      // handleSend будет вызван в handleActionClick
    }
  },
  {
    icon: <BarChart className="h-4 w-4" />,
    label: 'Show me Bar chart of my assets',
    action: () => {
      // handleSend будет вызван в handleActionClick
    }
  },
  {
    icon: <LineChart className="h-4 w-4" />,
    label: 'Show me Line chart of my assets',
    action: () => {
      // handleSend будет вызван в handleActionClick
    }
  }
];

const ChatInput: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);

  useEffect(() => {
    // Показываем меню при фокусе на поле ввода
    if (isFocused && input === '') {
      setShowMenu(true);
    } else if (!isFocused) {
      setShowMenu(false);
    }
  }, [isFocused, input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/') {
      setShowMenu(true);
    } else if (e.key === 'Escape') {
      setShowMenu(false);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      // Handle sending the message
      setInput('');
      setShowMenu(false);
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    setInput(action.label);
    setTimeout(() => {
      handleSend();
    }, 0);
    setShowMenu(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    // Скрываем меню, если пользователь начал вводить текст
    if (value && !value.startsWith('/')) {
      setShowMenu(false);
    }
  };

  return (
    <div className="relative flex-1">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message or press / for commands..."
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ minHeight: '44px', maxHeight: '200px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </div>
      {showMenu && (
        <div className="absolute left-0 top-0 -translate-y-full mb-2 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg z-20">
          <div className="flex flex-col gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput; 