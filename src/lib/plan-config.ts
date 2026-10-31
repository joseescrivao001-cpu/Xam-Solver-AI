/**
 * Compatibilidade: `plan-config` era a fonte de verdade antiga.
 * Hoje delega em `@/lib/plans`, para que exista apenas um sítio com preços.
 */
export { GUEST_CREDITS, PLANS, PREMIUM_CREDITS, SIGNUP_CREDITS } from "@/lib/plans";
