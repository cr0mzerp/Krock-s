export const base44 = {
  auth: {
    me: async () => ({ full_name: 'Lord', email: 'user@example.com' }),
  },
  entities: {
    ChatSession: {
      list: async () => ([]),
      create: async (data) => ({ id: 'new-id', ...data }),
      update: async (id, data) => ({ id, ...data }),
    },
    Artifact: {
      list: async () => ([]),
    },
  },
  integrations: {
    Core: {
      InvokeLLM: async () => 'Krock is connected but needs actual WebSocket binding.',
    },
  },
};
