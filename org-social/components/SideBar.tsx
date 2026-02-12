"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Drawer,
  Burger,
  ScrollArea,
  Image,
  Modal,
  TextInput,
  Button,
  ActionIcon,
} from "@mantine/core";
import {
  Squares2X2Icon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  FireIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

type MenuItem =
  | { type: "link"; label: string; href: string; icon: React.ElementType }
  | { type: "heading"; label: string };

const MENU_ITEMS: MenuItem[] = [
  { type: "heading", label: "My Team" },
  {
    type: "link",
    label: "My Team Apps",
    href: "/dashboard/team-apps",
    icon: Squares2X2Icon,
  },
  {
    type: "link",
    label: "Team Directory",
    href: "/team-directory",
    icon: UsersIcon,
  },
  {
    type: "link",
    label: "To-do List",
    href: "/todo",
    icon: ClipboardDocumentListIcon,
  },
];

interface Todo {
  id: number;
  title: string;
  priority: "Low" | "Medium" | "High";
  completed: boolean;
  createdAt: string;
}

function SidebarContent({
  pathname,
  onNavigate,
  todos,
  openTodoModal,
  completeTodo,
}: {
  pathname: string;
  onNavigate?: () => void;
  todos?: Todo[];
  openTodoModal?: () => void;
  completeTodo?: (id: number) => void;
}) {
  // ✅ High → Medium → Low, incomplete only
  const sidebarTodos =
    todos
      ?.filter((t) => !t.completed)
      .sort((a, b) => {
        const rank = { High: 3, Medium: 2, Low: 1 };
        return rank[b.priority] - rank[a.priority];
      }) || [];

  const getPriorityIcon = (priority: Todo["priority"]) => {
    if (priority === "Low") return CheckBadgeIcon;
    if (priority === "Medium") return ExclamationTriangleIcon;
    return FireIcon;
  };

  const getPriorityIconColor = (priority: Todo["priority"]) => {
    if (priority === "Low") return "text-yellow-500";
    if (priority === "Medium") return "text-orange-500";
    return "text-red-500";
  };

  return (
    <nav className="flex flex-col">
      {/* Logo */}
      <div className="flex-shrink-0 flex items-center mb-6">
        <Link
          href="/"
          className="text-xl font-bold text-blue-600 flex items-center"
        >
          <Image src="/logo.webp" alt="Logo" width={200} height={40} />
        </Link>
      </div>

      {MENU_ITEMS.map((item, idx) => {
        if (item.type === "heading") {
          return (
            <div
              key={idx}
              className="mt-4 mb-2 text-gray-500 uppercase font-semibold text-xs tracking-wider"
            >
              {item.label}
            </div>
          );
        }

        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (item.href === "/todo") {
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                openTodoModal?.();
                onNavigate?.();
              }}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-700 rounded hover:bg-blue-100"
            >
              <Icon className="h-5 w-5 text-gray-500" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded transition ${
              isActive
                ? "bg-blue-100 text-blue-700 font-semibold"
                : "text-gray-700 hover:bg-blue-100"
            }`}
          >
            <Icon className="h-5 w-5 text-gray-500" />
            {item.label}
          </Link>
        );
      })}

      {sidebarTodos.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-gray-500 uppercase font-semibold text-xs tracking-wider px-4">
            Tasks
          </div>

          <ScrollArea h={260} offsetScrollbars>
            <ol className="list-decimal list-inside space-y-1 pr-2">
              {sidebarTodos.map((todo) => {
                const PriorityIcon = getPriorityIcon(todo.priority);

                return (
                  <li
                    key={todo.id}
                    className="flex items-center justify-between text-sm pl-4 pr-2"
                  >
                    <span className="flex items-center gap-2 cursor-pointer">
                      <PriorityIcon
                        className={`h-4 w-4 ${getPriorityIconColor(todo.priority)}`}
                        onClick={() => completeTodo?.(todo.id)}
                        title="Click to mark completed"
                      />
                      {todo.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        </div>
      )}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname() ?? "";
  const [opened, setOpened] = useState(false);
  const [todoModal, setTodoModal] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");

  const fetchTodos = async () => {
    const res = await fetch("/api/todos");
    const data = await res.json();
    if (data.todos) setTodos(data.todos);
  };

  const addTodo = async () => {
    if (!newTodo) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: newTodo, priority }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      setNewTodo("");
      setPriority("Medium");
      fetchTodos();
      setTodoModal(false);
    }
  };

  const completeTodo = async (id: number) => {
    await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    fetchTodos();
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const modalTodos = [
    ...todos.filter((t) => !t.completed),
    ...todos.filter((t) => t.completed),
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full flex-col p-4 overflow-y-auto">
        <SidebarContent
          pathname={pathname}
          todos={todos}
          openTodoModal={() => setTodoModal(true)}
          completeTodo={completeTodo}
        />
      </div>

      {/* Mobile drawer */}
      <div className="md:hidden">
        <div className="p-2">
          <Burger opened={opened} onClick={() => setOpened((o) => !o)} />
        </div>
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          title="Menu"
          padding="md"
          size="xs"
          removeScrollProps={{ enabled: false }}
        >
          <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setOpened(false)}
              todos={todos}
              openTodoModal={() => setTodoModal(true)}
              completeTodo={completeTodo}
            />
          </ScrollArea>
        </Drawer>
      </div>

      {/* Todo Modal */}
      <Modal
        opened={todoModal}
        onClose={() => setTodoModal(false)}
        title="My To-dos"
        size="md"
      >
        <div className="mb-4 flex gap-2">
          <TextInput
            placeholder="New task"
            value={newTodo}
            onChange={(e) => setNewTodo(e.currentTarget.value)}
            className="flex-1"
          />
          <select
            className="p-2 rounded bg-transparent hover:bg-gray-100 focus:outline-none focus:ring-0"
            value={priority}
            onChange={(e) =>
              setPriority(e.currentTarget.value as "Low" | "Medium" | "High")
            }
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <Button size="xs" variant="filled" onClick={addTodo}>
            Add
          </Button>
        </div>

        <ul className="space-y-1">
          {modalTodos.map((todo) => (
            <li
              key={todo.id}
              className={`flex items-center justify-between ${
                todo.completed ? "line-through text-gray-400" : ""
              }`}
            >
              <span>
                {todo.title} ({todo.priority})
              </span>
              {!todo.completed && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={() => completeTodo(todo.id)}
                >
                  <CheckCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </ActionIcon>
              )}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
