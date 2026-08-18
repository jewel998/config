import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Firestore } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import type { BaseRepository } from "./base-repository";
import type { RepositoryContext, ValidationError } from "./types";

type AnyRepository = BaseRepository<any, any, any>;
type RepositoryConstructor<R extends AnyRepository> = new (
  firestore: Firestore,
  queryClient: any,
) => R;

/**
 * React hook factory that wraps a repository class with TanStack Query
 * integration. Provides reactive queries and mutations with automatic
 * cache invalidation.
 *
 * Usage:
 *   const { getAll, create, update, remove } = useRepository(ConfigRepository, ctx);
 */
export function useRepository<
  TEntity extends { id: string },
  TCreate extends Record<string, unknown>,
  TUpdate extends Record<string, unknown>,
  R extends BaseRepository<TEntity, TCreate, TUpdate>,
>(
  RepoClass: new (firestore: Firestore, queryClient: any) => R,
  ctx: RepositoryContext,
) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const repo = useMemo(
    () => new RepoClass(db, queryClient),
    [RepoClass, queryClient],
  );

  const authUser = user ? { uid: user.uid, email: user.email } : null;

  const getAll = useQuery({
    queryKey: ["dao", RepoClass.name, ctx.projectId, ctx.environmentId ?? ""],
    queryFn: () => repo.getAll(ctx),
    enabled: !!ctx.projectId,
  });

  const create = useMutation({
    mutationFn: (input: TCreate) => repo.create(input, ctx, authUser),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TUpdate }) =>
      repo.update(id, input, ctx, authUser),
  });

  const remove = useMutation({
    mutationFn: (id: string) => repo.delete(id, ctx, authUser),
  });

  const batchCreate = useMutation({
    mutationFn: (inputs: TCreate[]) => repo.batchCreate(inputs, ctx, authUser),
  });

  return { repo, getAll, create, update, remove, batchCreate };
}
