// src/services/authService.js
// Centralized authentication service that wraps Supabase calls.
// This keeps auth logic in one place and can be extended later.

import { supabase } from './supabase';

/**
 * Sign in a user with email and password.
 * Returns the Supabase auth response.
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/**
 * Sign up a new user.
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

/**
 * Sign out the current user.
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get the currently logged‑in user.
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};
