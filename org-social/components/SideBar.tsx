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
  CheckIcon,
} from "@mantine/core";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

type MenuItem =
  | { type: "link"; label: string; href: string }
  | { type: "heading"; label: string };

const MENU_ITEMS: MenuItem[] = [
  { type: "heading", label: "My Team" },
  { type: "link", label: "My Team Apps", href: "/dashboard/team-apps" },
  { type: "link", label: "Team Directory", href: "/team-directory" },
  { type: "link", label: "To-do List", href: "/todo" }, // open modal
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
  const getPriorityColor = (priority: string) => {
    if (priority === "Low") return "yellow";
    if (priority === "Medium") return "orange";
    return "red";
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

        const baseClass =
          "block w-full text-left px-4 py-2 text-sm rounded transition";
        const activeClass = isActive
          ? "bg-blue-100 text-blue-700 font-semibold"
          : "text-gray-700 hover:bg-blue-100";

        if (item.href === "/todo") {
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => {
                openTodoModal?.();
                onNavigate?.();
              }}
              className="block w-full text-left px-4 py-1.5 text-gray-700 rounded hover:bg-blue-100"
            >
              <span
                style={{ fontSize: 14, lineHeight: "16px", fontWeight: 400 }}
              >
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`${baseClass} ${activeClass}`}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Sidebar todo list (top 5, not completed) */}
      {todos && todos.length > 0 && (
        <ol className="mt-2 list-decimal list-inside space-y-1">
          {todos
            .filter((t) => !t.completed)
            .slice(0, 5)
            .map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 cursor-pointer">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: getPriorityColor(todo.priority) }}
                    onClick={() => completeTodo?.(todo.id)}
                    title="Click to mark completed"
                  ></span>
                  {todo.title}
                </span>
              </li>
            ))}
        </ol>
      )}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const [todoModal, setTodoModal] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTodos = async () => {
    const res = await fetch("/api/todos");
    const data = await res.json();
    if (data.todos) {
      // Sort by oldest first
      setTodos(
        data.todos.sort(
          (a: Todo, b: Todo) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
    }
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
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <Button
            size="xs"
            variant="filled"
            onClick={() => setModalOpen(true)}
            style={{
              backgroundColor: "var(--color-primary)",
              color: "white",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-primary)")
            }
          >
            Add
          </Button>
        </div>

        {/* All todos in modal */}
        <ul className="space-y-1">
          {todos.map((todo) => (
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
