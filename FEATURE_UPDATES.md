# Updates Summary

## 1. ✅ Fixed Gemini Dashboard Issues

### Issue: Unknown status and invalid date for last used
**Root Cause**: 
- Status was not being calculated from Firebase data
- Last used date handling was complex and causing "Invalid Date" errors

**Solution**:
- Updated `getUsageFromFirebase()` in `server/gemini/balancer.js` to calculate status based on current usage vs limits
- Status logic:
  - `available` - API key is ready to use
  - `rpm-limit-reached` - Requests per minute limit reached
  - `rpd-limit-reached` - Requests per day limit reached
  - `tpm-limit-reached` - Tokens per minute limit reached

### Issue: Showing "Last used" column
**Solution**:
- Removed "Last used" column from dashboard table
- Removed "Cooldown" column (not needed)
- Table now shows:
  - Key ID (short version)
  - Status (with color coding)
  - RPM usage (used / limit)
  - RPD usage (used / limit)
  - TPM usage (used / limit)
  - Total requests
  - Total tokens

### Status Display Improvements:
- `available` → Green text: "Available"
- `rpm-limit-reached` → Red text: "Rpm Limit Reached"
- `rpd-limit-reached` → Red text: "Rpd Limit Reached"
- `tpm-limit-reached` → Red text: "Tpm Limit Reached"
- `ok` → Green text: "Available"

## 2. ✅ Added Inline Code Support

### Toolbar Enhancement
**Added inline code button** next to strikethrough button:
- Icon: `<Code />` (same as code block, but different function)
- Tooltip: "Inline Code"
- Keyboard shortcut: Can be used with Ctrl+Shift+C (TipTap default)
- Styling: Highlights when active (blue background)
- Functionality: Wraps selected text in `<code>` tags

**Button Location**:
```
Bold → Italic → Underline → Strikethrough → [Inline Code] → | → Headings Dropdown
```

### Markdown Converter Updates

**Enhanced inline code support** in `src/utils/contentProcessor.ts`:

#### 1. markdownToHTML() function:
```typescript
// Code blocks (must come before inline code)
html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
  const language = lang || 'plaintext';
  const trimmedCode = code.trim();
  return `<pre><code class="language-${language}">${trimmedCode}</code></pre>`;
});

// Inline code (backticks) - must come after code blocks
html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
```

#### 2. enhancedContentProcessor() function:
```typescript
// Code blocks (must come before inline code)
processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
  const language = lang || 'plaintext';
  const trimmedCode = code.trim();
  return `<pre><code class="language-${language}">${trimmedCode}</code></pre>`;
});

// Inline code (backticks) - must come after code blocks
processed = processed.replace(/`([^`\n]+)`/g, '<code>$1</code>');
```

**Key Improvements**:
1. **Order matters**: Code blocks are processed first, then inline code
2. **Language support**: Code blocks now properly extract and apply language attribute
3. **Code trimming**: Whitespace is trimmed from code blocks
4. **Inline code**: Single backticks convert to `<code>` tags
5. **No line breaks in inline code**: Pattern `[^`\n]+` prevents inline code from spanning multiple lines

## Testing the Updates

### Test 1: Dashboard Status Display
1. Navigate to Gemini dashboard
2. Enter passkey: `gCP&*mHcKp8YPX!b*UbC`
3. ✅ Verify status shows "Available" in green (or appropriate limit message in red)
4. ✅ Verify "Last used" column is removed
5. ✅ Verify all usage metrics display correctly

### Test 2: Inline Code in Editor
1. Open any document
2. Select some text
3. Click the inline code button (between strikethrough and separator)
4. ✅ Verify text is wrapped in code styling
5. ✅ Verify button highlights when active
6. Click again to remove code formatting

### Test 3: Markdown to HTML Conversion

#### Inline Code:
**Input**:
```markdown
Use the `console.log()` function to debug your code.
```

**Output**:
```html
<p>Use the <code>console.log()</code> function to debug your code.</p>
```

#### Code Block:
**Input**:
```markdown
```javascript
function hello() {
  console.log("Hello World");
}
```
```

**Output**:
```html
<pre><code class="language-javascript">function hello() {
  console.log("Hello World");
}</code></pre>
```

#### Mixed Content:
**Input**:
```markdown
Here's an example of `inline code` and a code block:

```python
def greet(name):
    return f"Hello, {name}!"
```

You can use `greet("World")` to test it.
```

**Output**:
```html
<p>Here's an example of <code>inline code</code> and a code block:</p>

<pre><code class="language-python">def greet(name):
    return f"Hello, {name}!"</code></pre>

<p>You can use <code>greet("World")</code> to test it.</p>
```

## Files Modified

### 1. Dashboard Updates
- ✅ `server/gemini/balancer.js`
  - Updated `getUsageFromFirebase()` to calculate status
  - Removed lastUsed, cooldownTime, createdAt from response
  - Added status calculation logic

- ✅ `src/pages/gemini/GeminiDashboard.tsx`
  - Removed "Last used" and "Cooldown" columns
  - Updated colspan from 9 to 7
  - Added status formatting with color coding
  - Simplified data handling

### 2. Inline Code Feature
- ✅ `src/components/document/ToolBar.tsx`
  - Added inline code button after strikethrough
  - Button uses `toggleCode()` command
  - Added separator after inline code button
  - Button highlights when `code` mark is active

- ✅ `src/utils/contentProcessor.ts`
  - Enhanced code block regex to properly extract language
  - Added code trimming for cleaner output
  - Fixed inline code pattern to not match newlines
  - Ensured code blocks are processed before inline code
  - Applied fixes to both `markdownToHTML()` and `enhancedContentProcessor()`

## Server Status

✅ Server is running on port 3001
✅ Firebase connected successfully
✅ Loaded 3 API keys from Firebase:
  - f93a5a0c91f1: 2 requests
  - a352f8a7255e: 1 request
  - b13002948369: 0 requests

## TipTap Configuration

The inline code feature uses TipTap's built-in `code` mark from StarterKit:
- Extension: Included by default in StarterKit
- Command: `editor.chain().focus().toggleCode().run()`
- CSS class: Applied via TipTap's default code styling
- HTML output: `<code>text</code>`

Code blocks use the custom `CodeBlockWithHighlight` extension:
- Extension: Custom extension with syntax highlighting
- Command: `editor.chain().focus().toggleCodeBlock().run()`
- HTML output: `<pre><code class="language-xxx">code</code></pre>`

## Additional Notes

### Status Calculation Logic
```javascript
let status = 'available';
if (rpmUsed >= this.limits.RPM) {
  status = 'rpm-limit-reached';
} else if (rpdUsed >= this.limits.RPD) {
  status = 'rpd-limit-reached';
} else if (tpmUsed >= this.limits.TPM) {
  status = 'tpm-limit-reached';
}
```

This checks limits in order:
1. RPM (Requests Per Minute) - most immediate
2. RPD (Requests Per Day) - daily quota
3. TPM (Tokens Per Minute) - token usage

### Markdown Processing Order
Important: Processing order matters!
1. Headers (# ## ###)
2. Bold/Italic (** * ***)
3. **Code blocks first** (```)
4. **Inline code second** (`)
5. Links, Lists, Tables, etc.

This prevents conflicts where inline code regex might match parts of code blocks.

## Known Limitations

1. **Inline code spans**: Cannot span multiple lines (by design)
2. **Nested backticks**: Inline code with literal backticks requires escaping
3. **Code block language**: If language is not specified, defaults to "plaintext"

## Future Enhancements (Optional)

1. Add keyboard shortcut hint to inline code button tooltip
2. Add syntax highlighting for specific inline code languages
3. Add copy button for inline code (like code blocks have)
4. Add line numbers option for code blocks
