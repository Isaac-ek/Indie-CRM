import test from "node:test";
import assert from "node:assert/strict";
import { transcribeAudioBuffer } from "../src/lib/transcription";
import { fetchOutlookMessages } from "../src/lib/outlook-sync";
import { getWorkspaceAnalytics } from "../src/lib/analytics-queries";

test("transcribeAudioBuffer returns fallback transcription when offline or mock mode", async () => {
  const dummyBuffer = Buffer.from("fake-audio-bytes");
  const result = await transcribeAudioBuffer(dummyBuffer, "client-call.mp3", "audio/mpeg");

  assert.equal(result.provider, "local-fallback");
  assert.equal(result.model, "local-whisper-mock");
  assert.match(result.text, /Voice Note Transcription \(client-call.mp3\)/);
  assert.match(result.text, /Client discussed project scope/);
});

test("fetchOutlookMessages returns formatted Outlook import items", async () => {
  const messages = await fetchOutlookMessages("mock_token", 5);

  assert.ok(Array.isArray(messages));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, "outlook_msg_101");
  assert.equal(messages[0].senderEmail, "claire@luminarybrand.test");
  assert.match(messages[0].subject, /Outlook Inquiry/);
});

test("getWorkspaceAnalytics calculates demo metrics correctly", async () => {
  const analytics = await getWorkspaceAnalytics("northstar-studio");

  assert.equal(analytics.totalLeads, 12);
  assert.equal(analytics.activeLeads, 8);
  assert.equal(analytics.wonLeads, 3);
  assert.equal(analytics.lostLeads, 1);
  assert.equal(analytics.closeRatePercentage, 75);
  assert.equal(analytics.avgLeadScore, 82);
  assert.ok(Array.isArray(analytics.stageBreakdown));
  assert.ok(analytics.stageBreakdown.length > 0);
});
