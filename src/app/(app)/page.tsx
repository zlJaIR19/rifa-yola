import { Board } from "@/components/Board";
import { getBoard } from "@/lib/server/data";
import type { BoardNumber } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  let initial: BoardNumber[] | null = null;
  try {
    initial = await getBoard();
  } catch (err) {
    console.error("initial board load failed", err);
  }
  return <Board initial={initial} />;
}
