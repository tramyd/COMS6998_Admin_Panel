import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PromptChainStep = {
  id: number;
  chain_id: string;
  user_id: string;
  stage: "draft" | "improve";
  model: string;
  prompt: string;
  response: string;
  image_mime_type: string;
  created_at: string;
};

export default async function PromptChainsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_chain_steps")
    .select(
      "id, chain_id, user_id, stage, model, prompt, response, image_mime_type, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to load prompt chain steps:", error);
    const message =
      error.code === "PGRST205"
        ? "The prompt_chain_steps table is missing. Apply 20261025150000_capture_prompt_chain_steps.sql to this Supabase project, then refresh."
        : "Could not load prompt chains. Check the Supabase access policies.";
    return (
      <p className="page-error" role="alert">
        {message}
      </p>
    );
  }

  const chains = new Map<string, PromptChainStep[]>();
  for (const step of (data ?? []) as PromptChainStep[]) {
    const steps = chains.get(step.chain_id) ?? [];
    steps.push(step);
    chains.set(step.chain_id, steps);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">AI CONFIGURATION</p>
          <h1>Prompt chains</h1>
          <p className="page-subtitle">
            Inspect the exact prompts, model responses, and model used at each
            caption-generation step.
          </p>
        </div>
        <span className="count-badge">{chains.size} runs · latest 200 steps</span>
      </div>
      {chains.size === 0 ? (
        <section className="panel-card">
          <p className="empty-state">
            No prompt-chain runs yet. New caption generations will appear here.
          </p>
        </section>
      ) : (
        Array.from(chains.entries()).map(([chainId, steps]) => (
          <section className="panel-card prompt-chain-card" key={chainId}>
            <div className="section-heading prompt-chain-heading">
              <div>
                <h2>Generation run</h2>
                <p>
                  <code className="id-text">{chainId}</code>
                  {" · "}
                  User <code className="id-text">{steps[0].user_id}</code>
                </p>
              </div>
              <span className="count-badge">{steps.length} steps</span>
            </div>
            <div className="prompt-chain-steps">
              {steps
                .sort((a, b) => a.id - b.id)
                .map((step) => (
                  <article className="prompt-chain-step" key={step.id}>
                    <div className="prompt-step-heading">
                      <div>
                        <h3>
                          {step.stage === "draft"
                            ? "1. Initial caption"
                            : "2. Caption improvement"}
                        </h3>
                        <p>
                          Model <code>{step.model}</code>
                          {" · "}
                          Image <code>{step.image_mime_type}</code>
                        </p>
                      </div>
                      <time dateTime={step.created_at}>
                        {new Date(step.created_at).toLocaleString()}
                      </time>
                    </div>
                    <div className="prompt-step-content">
                      <div>
                        <h4>Prompt</h4>
                        <pre>{step.prompt}</pre>
                      </div>
                      <div>
                        <h4>Response</h4>
                        <pre>{step.response || "(Empty response)"}</pre>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
