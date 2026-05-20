# Employee Code Validation - User Manual

## How to Enter Employee Code

When registering a new account, you need to enter your employee code in the **Employee Code** field.

### ✅ **Format Requirements:**
- Must start with **"EMP"** (uppercase)
- Must be followed by **numbers only**
- Example: `EMP1234`, `EMP567`, `EMP99999`

### ✅ **Valid Examples:**
- `EMP1` (minimum)
- `EMP123`
- `EMP1234` 
- `EMP56789`
- `EMP999999`

### ❌ **Invalid Examples:**
- `emp1234` ❌ (lowercase not allowed)
- `EMP` ❌ (missing numbers)
- `123EMP` ❌ (wrong order)
- `EMP12A` ❌ (letters after EMP not allowed)
- `EMP-123` ❌ (no special characters)
- `EMP 123` ❌ (no spaces)

### 📝 **How to Use:**
1. Click on the **Employee Code** field
2. Type "EMP" followed by your employee number
3. Example: If your employee number is 1234, enter `EMP1234`
4. The system will validate the format automatically
5. You'll see an error message if the format is incorrect

### 🔧 **Technical Details:**
- **Minimum length:** 4 characters (EMP + at least 1 digit)
- **Maximum length:** 15 characters
- **Pattern:** Must match `EMP` + numbers only
- **Case sensitive:** Must be uppercase "EMP"

### 💡 **Tips:**
- Make sure to use uppercase "EMP"
- Only use numbers after "EMP" (no letters or symbols)
- Don't include spaces or dashes
- The system will show you exactly what's wrong if there's an error