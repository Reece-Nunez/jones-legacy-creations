// Default legal language for the client-facing approval flows. These are
// pre-filled into the admin forms but remain editable per document, and the
// exact text shown to the client is snapshotted onto the record (consent_text /
// disclaimer_text) as ESIGN evidence.
//
// NOTE: This is reasonable plain-language boilerplate, NOT legal advice. Blake
// should have an attorney review and adapt the wording before relying on it.

export const DEFAULT_CHANGE_ORDER_CONSENT =
  "By typing my name below and clicking “Sign & Approve,” I acknowledge " +
  "that I have read and understand this Change Order. I agree to the described " +
  "change in the scope of work and to the corresponding adjustment to the " +
  "contract price and schedule stated above. I understand this constitutes an " +
  "amendment to my construction contract with Jones Legacy Creations, that my " +
  "electronic signature is legally binding under the U.S. E-SIGN Act, and that " +
  "work reflecting this change may proceed once signed.";

export const DEFAULT_BID_ACCEPTANCE_TERMS =
  "By typing my name below and clicking “Submit Bid,” I confirm that I am " +
  "willing and able to perform the scope of work described above for this " +
  "project, and that any amount I enter is my good-faith bid for that work. I " +
  "understand this is my submission for Jones Legacy Creations to review, that " +
  "they may accept or decline it, and that a separate written agreement may " +
  "govern the final terms of the work if my bid is accepted. My electronic " +
  "submission is recorded with the date, time, and my identity as evidence of " +
  "my response.";

export const DEFAULT_SELECTION_DISCLAIMER =
  "By approving this selection, I confirm that this is the material, product, " +
  "color, and finish I have chosen for my project. I understand that natural " +
  "materials and manufactured products vary in color, veining, grain, texture, " +
  "and appearance, and that showroom samples, photographs, and on-screen images " +
  "are representative only and may differ from the installed product. I accept " +
  "responsibility for this selection. Once this item is ordered and/or " +
  "installed, Jones Legacy Creations is not liable for my subsequent " +
  "dissatisfaction with the appearance or aesthetics of the selection, and any " +
  "change will be handled as a separate Change Order at my expense. If I " +
  "decline, I understand the project may be delayed until a replacement " +
  "selection is approved.";
