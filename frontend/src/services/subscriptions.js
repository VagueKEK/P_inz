import http, { url } from "./http";

export const SubAPI = {
  list: async () => {
    const { data } = await http.get(url("/api/subscriptions"));
    return Array.isArray(data) ? data : (data.results || []);
  },
  create: (payload) => http.post(url("/api/subscriptions"), payload),
  update: (id, patch) => http.patch(url(`/api/subscriptions/${id}`), patch),
  remove: (id) => http.delete(url(`/api/subscriptions/${id}`)),
  deactivate: (id) => http.post(url(`/api/subscriptions/${id}/deactivate`)),
};
