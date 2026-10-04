/* Streamlit Custom Component bridge (global, single definition) */
window.__streamlitArgs = window.__streamlitArgs || { role: null, student: null, weeks: [], portfolio: [], teacher: null, flash: null, result: null, worksheet: null, uploadResult: null, games: null };
const Streamlit = {
  setFrameHeight: function(h) {
    var s = Math.max(640, Math.ceil(Number(h) || 640));
    try { window.parent.postMessage({ isStreamlitMessage: true, type: "streamlit:setFrameHeight", height: s }, "*"); } catch (e) {}
  },
  setComponentValue: function(v) {
    try { window.parent.postMessage({ isStreamlitMessage: true, type: "streamlit:setComponentValue", value: v }, "*"); } catch (e) {}
  }
};
window.addEventListener("message", function(event) {
  if (!event.data || event.data.type !== "streamlit:render") return;
  var next = (event.data.args && (event.data.args.args || event.data.args)) || window.__streamlitArgs;
  window.__streamlitArgs = next;
  window.dispatchEvent(new CustomEvent("dsArgs", { detail: next }));
});
