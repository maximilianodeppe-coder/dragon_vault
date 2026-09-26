export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server) return;
  const { data, isAdmin } = useVault();
  if (!data.auth.user && to.path !== '/login') return navigateTo('/login');
  if (data.auth.user && to.path === '/login' && !data.storageError) return navigateTo('/formatos');
  if (!isAdmin.value && ['/usuarios', '/expansiones', '/especiales'].includes(to.path)) return navigateTo('/formatos');
});
