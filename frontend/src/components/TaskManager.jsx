import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardListIcon,
  PlusIcon,
  XIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  MenuIcon,
} from '@heroicons/react/outline';
import toast from 'react-hot-toast';

const TaskManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const widgetRef = useRef(null);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('staffTasks');
    console.log('Loading saved tasks from localStorage:', savedTasks);
    
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTasks(parsedTasks);
        console.log('Loaded tasks:', parsedTasks.length);
      } catch (error) {
        console.error('Error parsing saved tasks:', error);
        setTasks([]);
      }
    } else {
      // Initialize with some example tasks if no tasks exist
      const defaultTasks = [
        {
          id: Date.now(),
          text: "Welcome to Task Manager!",
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: Date.now() + 1,
          text: "Click to mark as complete",
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: Date.now() + 2,
          text: "Tasks are saved automatically",
          completed: false,
          createdAt: new Date().toISOString(),
        }
      ];
      setTasks(defaultTasks);
      localStorage.setItem('staffTasks', JSON.stringify(defaultTasks));
    }
    
    setIsInitialized(true);
    
    // Set initial position (bottom right)
    setPosition({ x: window.innerWidth - 380, y: window.innerHeight - 500 });
  }, []);

  // Save tasks to localStorage whenever they change, but only after initialization
  useEffect(() => {
    if (isInitialized) {
      console.log('Saving tasks to localStorage:', tasks.length);
      localStorage.setItem('staffTasks', JSON.stringify(tasks));
    }
  }, [tasks, isInitialized]);

  const addTask = () => {
    if (newTask.trim()) {
      const newTaskObj = {
        id: Date.now(),
        text: newTask.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTasks(prevTasks => [...prevTasks, newTaskObj]);
      setNewTask('');
      toast.success('Task added');
    }
  };

  const toggleTask = (id) => {
    setTasks(prevTasks =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks(prevTasks => prevTasks.filter((task) => task.id !== id));
    toast.success('Task deleted');
  };

  const deleteCompletedTasks = () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) {
      toast.error('No completed tasks to clear');
      return;
    }
    setTasks(prevTasks => prevTasks.filter((task) => !task.completed));
    toast.success(`Cleared ${completedTasks.length} completed tasks`);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.task-manager-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - (position.x || 0),
        y: e.clientY - (position.y || 0),
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within window bounds
      const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 360);
      const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 400);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Debug: Log tasks whenever they change
  useEffect(() => {
    if (isInitialized) {
      console.log('Tasks state updated:', tasks.length, 'tasks');
    }
  }, [tasks, isInitialized]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 group"
        style={{ background: '#020c4c' }}
      >
        <ClipboardListIcon className="h-6 w-6" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Task Manager Widget */}
      {isOpen && (
        <div
          ref={widgetRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl w-[360px] max-w-[90vw] flex flex-col"
          style={{
            top: position.y,
            left: position.x,
            cursor: isDragging ? 'grabbing' : 'default',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Header */}
          <div
            className="task-manager-header bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-t-xl flex justify-between items-center cursor-move"
            style={{ background: '#020c4c' }}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-2">
              <ClipboardListIcon className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold">Task Manager</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="px-4 py-2 bg-gray-50 border-b flex justify-between text-sm">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {activeCount} pending • {completedCount} done
              </span>
            </div>
            {completedCount > 0 && (
              <button
                onClick={deleteCompletedTasks}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Clear completed
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b">
            {['all', 'active', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  filter === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Add Task Input */}
          <div className="p-3 border-b">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a new task..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={addTask}
                disabled={!newTask.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ background: '#020c4c' }}
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto max-h-[400px] p-3 space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ClipboardListIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No tasks yet</p>
                <p className="text-xs">Add a task to get started</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition group ${
                    task.completed ? 'opacity-75' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {task.completed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-blue-500 transition" />
                    )}
                  </button>
                  <p
                    className={`flex-1 text-sm ${
                      task.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {task.text}
                  </p>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer with hint */}
          <div className="p-2 bg-gray-50 text-center text-xs text-gray-400 rounded-b-xl border-t">
            💡 Tasks are saved automatically
          </div>
        </div>
      )}
    </>
  );
};

export default TaskManager;