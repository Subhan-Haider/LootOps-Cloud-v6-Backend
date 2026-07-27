const fs = require('fs');
const lines = fs.readFileSync('src/lib/api.ts', 'utf8').split('\n');
const goodLines = lines.slice(0, 870);
const rest = `        ...f,
        url: f.url.startsWith("http") ? f.url : \`\${API_BASE}\${f.url}\`,
        thumbnailUrl: f.thumbnailUrl ? (f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : \`\${API_BASE}\${f.thumbnailUrl}\`) : null
      }));
    },
    getNotes: async (token: string): Promise<any[]> => {
      const { data } = await apiInstance.get("/api/notes/vault", { headers: { "x-vault-token": token } });
      return data.notes || [];
    }
  },

  // Passwords API (Vault Protected)
  passwords: {
    getAll: async (token: string): Promise<any[]> => {
      const { data } = await apiInstance.get("/api/passwords", { headers: { "x-vault-token": token } });
      return data.passwords || [];
    },
    create: async (token: string, payload: any): Promise<any> => {
      const { data } = await apiInstance.post("/api/passwords", payload, { headers: { "x-vault-token": token } });
      return data.password;
    },
    update: async (token: string, id: string, payload: any): Promise<any> => {
      const { data } = await apiInstance.put(\`/api/passwords/\${id}\`, payload, { headers: { "x-vault-token": token } });
      return data.password;
    },
    delete: async (token: string, id: string): Promise<void> => {
      await apiInstance.delete(\`/api/passwords/\${id}\`, { headers: { "x-vault-token": token } });
    }
  }
};
`;

fs.writeFileSync('src/lib/api.ts', goodLines.join('\n') + '\n' + rest);
console.log("Done.");
