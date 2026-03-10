import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import HomeView from '../views/HomeView.vue';
import CoursesView from '../views/CoursesView.vue';
import CourseDetailView from '../views/CourseDetailView.vue';
import CoursePausedView from '../views/CoursePausedView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ImprintView from '../views/ImprintView.vue';
import ContactView from '../views/ContactView.vue';
import NotFoundView from '../views/NotFoundView.vue';

import DashboardView from '../views/DashboardView.vue';
import DashboardCourseCreateEditView from '../views/DashboardCourseCreateEditView.vue';
import DashboardCourseView from '../views/DashboardCourseView.vue';
import DashboardCourseStatisticsView from '../views/DashboardCourseStatisticsView.vue';
import DashboardPresetsView from '../views/DashboardPresetsView.vue';

const DEFAULT_TITLE = 'Think different Academy';
const routeTitles: Record<string, string> = {
    home: 'Think different Academy',
    courses: 'Kurzy',
    'course-detail': 'Kurz',
    'course-paused': 'Kurz pozastaven',
    login: 'Přihlášení',
    register: 'Registrace',
    imprint: 'Impressum',
    contact: 'Kontakt',
    terms: 'Obchodní podmínky',
    privacy: 'Ochrana osobních údajů',
    dashboard: 'Dashboard',
    'dashboard-course-create': 'Vytvořit kurz',
    'dashboard-course-edit': 'Upravit kurz',
    'dashboard-course': 'Kurz',
    'dashboard-course-statistics': 'Statistiky kurzu',
    'dashboard-presets': 'Spravovat šablony',
    notFound: '404 — Stránka nenalezena',
};

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/courses', name: 'courses', component: CoursesView },
        { path: '/courses/:uuid', name: 'course-detail', component: CourseDetailView },
        { path: '/courses/:uuid/paused', name: 'course-paused', component: CoursePausedView },
        { path: '/imprint', name: 'imprint', component: ImprintView },
        { path: '/contact', name: 'contact', component: ContactView },

        // Dashboard (auth) routes
        { path: '/login', name: 'login', component: LoginView },
        { path: '/register', name: 'register', component: RegisterView },
        { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
        { path: '/dashboard/courses/create', name: 'dashboard-course-create', component: DashboardCourseCreateEditView, meta: { requiresAuth: true } },
        { path: '/dashboard/courses/:uuid/edit', name: 'dashboard-course-edit', component: DashboardCourseCreateEditView, meta: { requiresAuth: true } },
        { path: '/dashboard/courses/:uuid/statistics', name: 'dashboard-course-statistics', component: DashboardCourseStatisticsView, meta: { requiresAuth: true } },
        { path: '/dashboard/courses/:uuid', name: 'dashboard-course', component: DashboardCourseView, meta: { requiresAuth: true } },
        { path: '/dashboard/presets', name: 'dashboard-presets', component: DashboardPresetsView, meta: { requiresAuth: true } },

        { path: '/terms', name: 'terms', component: () => import('../views/TermsView.vue') },
        { path: '/privacy', name: 'privacy', component: () => import('../views/PrivacyView.vue') },

        { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView },
    ],
});

router.afterEach((to) => {
    const title = to.name && routeTitles[to.name as string];
    document.title = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
});

// Auth guard
router.beforeEach((to) => {
    const authStore = useAuthStore();
    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
        return '/login';
    }
    // Dashboard routes require lecturer/admin role
    if (to.meta.requiresAuth && to.path.startsWith('/dashboard') && authStore.isLoggedIn && !authStore.canAccessDashboard) {
        return '/';
    }
    return true;
});

export default router;