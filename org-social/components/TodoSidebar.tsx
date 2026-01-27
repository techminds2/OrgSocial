"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  Select,
  Group,
  Stack,
  ActionIcon,
  Text,
} from "@mantine/core";
import { Trash, Edit } from "tabler-icons-react";

type Todo = {
  id: number;
  title: string;
  priority: "Low" | "Medium" | "High";
};

export default function TodoSidebar() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [opened, setOpened] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");

  const fetchTodos = async () => {
    const res = await fetch("/api/todos");
    const data = await res.json();
    setTodos(data.todos);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = async () => {
    if (!title) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority }),
    });
    if (res.ok) {
      setTitle("");
      setPriority("Medium");
      fetchTodos();
    }
  };

  const deleteTodo = async (id: number) => {
  const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    console.error("Delete failed:", err);
    return;
  }}

  const top5 = todos.slice(0, 5);

  return (
    <>
      <div>
        <Text fw={500} size="sm" className="text-gray-700">
          My To-do
        </Text>
        <ul className="mt-2 space-y-1">
          {top5.map((todo) => (
            <li key={todo.id} className="flex justify-between items-center">
              <span>
                {todo.title} ({todo.priority})
              </span>
              <ActionIcon color="red" onClick={() => deleteTodo(todo.id)}>
                <Trash size={16} />
              </ActionIcon>
            </li>
          ))}
        </ul>
        <Button mt="sm" size="xs" onClick={() => setOpened(true)}>
          Manage To-do
        </Button>
      </div>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="My To-do List"
        size="lg"
      >
        <Stack>
          {todos.map((todo) => (
            <Group key={todo.id} justify="space-between" align="center">
              <Text>
                {todo.title} ({todo.priority})
              </Text>
              <ActionIcon color="red" onClick={() => deleteTodo(todo.id)}>
                <Trash size={16} />
              </ActionIcon>
            </Group>
          ))}

          <TextInput
            placeholder="New task"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(v: any) => setPriority(v)}
            data={["Low", "Medium", "High"]}
          />
          <Button onClick={addTodo}>Add Task</Button>
        </Stack>
      </Modal>
    </>
  );
}
