# Grouped Accessors and Auto-Accessors for ECMAScript

This introduces an investigation into new syntax for _grouped accessors_ to classes and object literals and _auto-accessors_ to classes. 
A _grouped accessor_ is a single declaration that contains either or both both of the `get` and `set` methods for an accessor. 
An _auto-accessor_ is a simplified variant of a _grouped accessor_ that elides the bodies of the `get` and `set` methods and
introduces a private backing field used by both the getter and setter.

_**Under Consideration**: We may consider expanding _auto-accessors_ to work on object literals in the future, however the necessary
private name semantics are currently not defined for object literals._

## Status

**Stage:** 1  
**Champion:** Ron Buckton (@rbuckton)  

_For detailed status of this proposal see [TODO](#todo), below._  

## Authors

* Ron Buckton (@rbuckton)  

## Grouped Accessors

```js
class C {
  accessor x {
    get() { ... } // equivalent to `get x() { ... }`
    set(value) { ... } // equivalent to `set x(value) { ... }`
  }

  accessor y {
    get() { ... } // equivalent to `get y() { ... }`
    #set(value) { ... } // equivalent to `set #y(value) { ... }`
  }

  accessor #z {
    get() { ... } // equivalent to `get #z() { ... }`
    set(value) { ... } // equivalent to `set #z(value) { ... }`
  }
}

const obj = {
  accessor x {
    get() { ... }
    set(value) { ... }
  }
};
```

A _grouped accessor_ is essentially a way to define either one or both of the `get` and `set` methods of an accessor in a 
single logical group. This provides the following benefits:

- The `get` and `set` declarations are logically grouped together, which improves readability.
  - This can also result in an improved editor experience in editors with support for folding (i.e., `▶ accessor x { ... }`)
- A grouped `get` and `set` accessor pair with a _ComputedPropertyName_ only needs to have its name evaluated once.
- In a `class`, the setter for a public property can be marked as private using `#set`, this introduces both a public binding for the identifer,
  and a private binding for the identifier (but prefixed with `#`). For example:
  ```js
  class C {
    accessor y {
      get() { ... } 
      #set(value) { ... }
    }
  }
  ```
  Introduces a `y` getter on the prototype and a `#y` setter on the instance.
- A decorator applied to the group could observe both the `get` and `set` methods simultaneously for entangled operations. For example:
  ```js
  function dec({ get, set }, context) {
    ...
    return { get, set, };
  }
  class C {
    @dec
    accessor x {
      get() { ... }
      set(value) { ... }
    }
  }
  ```

## Auto-Accessors

```js
class C {
  accessor a = 1;                   // same as `accessor a { get; set; } = 1;`
  accessor b { } = 1;               // same as `accessor b { get; set; } = 1;`
  accessor c { get; set; } = 1;     // same as `accessor c = 1;`
  accessor d { get; } = 1;          // getter but no setter
  accessor e { set; } = 1;          // setter but no getter (use case: decorators)
  accessor f { get; #set; };        // getter with private setter `#f`;
  accessor g { #set; } = 1;         // private setter but no getter (use case: decorators)
  accessor #h = 1;                  // same as `accessor #g { get; set; } = 1;`
  accessor #i { } = 1;              // same as `accessor #h { get; set; } = 1;`
  accessor #j { get; set; } = 1;    // same as `accessor #i = 1;`
  accessor #k { get; } = 1;         // getter but no setter
  accessor #l { set; } = 1;         // setter but no getter (use case: decorators)

  // also allowed:
  accessor "foo";                   // same as `accessor "foo" { get; set; }`
  accessor 1;                       // same as `accessor 1 { get; set; }`
  accessor [x];                     // same as `accessor [x] { get; set; }`

  // not allowed:
  // accessor "bar" { get; #set; }  // error: no private setters for string properties
  // accessor 2 { get; #set; }      // error: no private setters for numeric properties
  // accessor [y] { get; #set; }    // error: no private setters for computed properties
  // accessor #m { get; #set; };    // error: accessor is already private
  // accessor #n { #set; };         // error: accessor is already private
}
```

An _auto-accessor_ is a simplified version of a _grouped accessor_ that allows you to elide the body of the `get` 
and `set` methods, and optionally provide an initializer. An _auto-accessor_ introduces a unique *unnamed* private field on 
the class which is wrapped by a generated getter and an optional generated setter. Using `#set` instead of `set` indicates that a 
private setter of the same name as the public member (but prefixed with `#`) exists on the object and provides privileged access to set the 
underlying value.

This provides the following benefits:
- Introduces accessors that can be overridden in subclasses without excess boilerplate.
- Provides a replacement for fields that allows you to observe reading and writing the value of the field with decorators.
- Allows you to perform initialization inline with the declaration, similar to fields.

## Proposed Syntax

```grammarkdown
ClassElement[Yield, Await] :
  ...
  `accessor` ClassElementName[?Yield, ?Await] AccessorGroup Initializer[?Yield, ?Await] `;`
  `accessor` ClassElementName[?Yield, ?Await] AccessorGroup
  `accessor` ClassElementName[?Yield, ?Await] Initializer[?Yield, ?Await]? `;`

AccessorGroup :
  `{` `}`
  `{` GetAccessorMethodOrStub SetAccessorMethodOrStub? `}`
  `{` SetAccessorMethodOrStub GetAccessorMethodOrStub? `}`

GetAccessorMethodOrStub :
  GetAccessorMethod
  GetAccessorStub

GetAccessorMethod :
  `get` `(` `)` `{` FunctionBody[~Yield, ~Await] `}`

GetAccessorStub :
  `get` `;`

SetAccessorMethodOrStub :
  SetAccessorMethod
  SetAccessorStub

SetAccessorMethod :
  PublicSetAccessorMethod
  PrivateSetAccessorMethod

PublicSetAccessorMethod :
  `set` `(` PropertySetParameterList `)` `{` FunctionBody[~Yield, ~Await] `}`

PrivateSetAccessorMethod :
  `#set` `(` PropertySetParameterList `)` `{` FunctionBody[~Yield, ~Await] `}`

SetAccessorStub :
  PublicSetAccessorStub
  PrivateSetAccessorStub

PublicSetAccessorStub :
  `set` `;`

PrivateSetAccessorStub :
  `#set` `;`
```

## Proposed Semantics

The following represents some approximate semantics for this proposal. The gist of which is the following:

- Only `accessor` properties with _Identifier_ names can have a `#set` stub or `#set` method:
    ```js
    class C {
        accessor x { get; #set; } // ok
        accessor #y { get; #set; } // syntax error
        accessor "z" { get; #set; } // syntax error
        accessor 1 { get; #set; } // syntax error
        accessor [expr] { get; #set; } // syntax error
    }
    ```
- You cannot have both a `set` and a `#set` in the same group:
    ```js
    class C {
        accessor x { get; #set; } // ok
        accessor y { set; #set; } // syntax error
    }
    ```
- You cannot combine `get`, `set`, or `#set` stub definitions with `get`, `set`, or `#set` methods:
    ```js
    class C {
        accessor x { get; #set; } // ok
        accessor y { get() { return 1; } set(v) { } } // ok
        accessor z { get() { return 1; } set; } // error
    }
    ```
- You cannot combine `get`, `set`, or `#set` methods with an initializer:
    ```js
    class C {
        accessor w = 1; // ok
        accessor x { get; } = 1; // ok
        accessor y { get; set; } = 1; // ok
        accessor z { get() { return 1; } } = 1; // error
    }
    ```
- You cannot have an `accessor` property that has a `#set` stub or method that collides with another private name on the class:
    ```js
    class C {
        #w;
        accessor w; // ok

        #x;
        accessor x { get; set; }; // ok

        #y;
        accessor y { get; #set; }; // error (collides with #y)

        #z;
        accessor z { get() { } #set(v) { } }; // error (collides with #z)
    }
    ```

### Early Errors
```grammarkdown
ClassElement : `accessor` ClassElementName AccessorGroup Initializer `;`
```
- It is a Syntax Error if _AccessorGroup_ Contains _GetAccessorMethod_.
- It is a Syntax Error if _AccessorGroup_ Contains _SetAccessorMethod_.
- It is a Syntax Error if _ClassElementName_ is not _Identifier_ and _AccessorGroup_ Contains _PrivateSetAccessorStub_.

```grammarkdown
ClassElement : `accessor` ClassElementName AccessorGroup
```
- It is a Syntax Error if _AccessorGroup_ Contains _GetAccessorMethod_ and _AccessorGroup_ Contains _SetAccessorStub_.
- It is a Syntax Error if _AccessorGroup_ Contains _SetAccessorMethod_ and _AccessorGroup_ Contains _GetAccessorStub_.
- It is a Syntax Error if _ClassElementName_ is not _Identifier_ and _AccessorGroup_ Contains _PrivateSetAccessorStub_.
- It is a Syntax Error if _ClassElementName_ is not _Identifier_ and _AccessorGroup_ Contains _PrivateSetAccessorMethod_.

_**Under Consideration:** We may choose to make it an early error to have both a grouped `set` and a grouped `#set` for the
same name on the same class._

### ClassElementEvaluation

With parameter _object_.

```grammarkdown
ClassElement : `accessor` ClassElementName AccessorGroup Initializer
```
1. Let _name_ be the result of evaluting _ClassElementName_.
2. ReturnIfAbrupt(_name_).
3. Let _initializer_ be a Function Object created in accordance with Step 3 of 
   https://tc39.es/ecma262/#sec-runtime-semantics-classfielddefinitionevaluation.
4. Return EvaluateAccessorGroup for _AccessorGroup_ with arguments _object_, _name_, and _initializer_.

```grammarkdown
ClassElement : `accessor` ClassElementName AccessorGroup
```
1. Let _name_ be the result of evaluting _ClassElementName_.
2. ReturnIfAbrupt(_name_).
3. Return EvaluateAccessorGroup for _AccessorGroup_ with arguments _object_, _name_, and ~empty~.

```grammarkdown
ClassElement : `accessor` ClassElementName Initializer `;`
```
1. Let _name_ be the result of evaluting _ClassElementName_.
2. ReturnIfAbrupt(_name_).
3. Let _initializer_ be a Function Object created in accordance with Step 3 of 
   https://tc39.es/ecma262/#sec-runtime-semantics-classfielddefinitionevaluation.
1. Return EvaluateAutoAccessor(_object_, _name_, _initializer_).

```grammarkdown
ClassElement : `accessor` ClassElementName `;`
```
1. Let _name_ be the result of evaluting _ClassElementName_.
2. ReturnIfAbrupt(_name_).
3. Return EvaluateAutoAccessor(_object_, _name_, ~empty~).

### EvaluateAccessorGroup

With parameters _object_, _name_, and _initializer_.

_**NOTE:** The following semantics are approximate and will be specified in full at a later date._

```grammarkdown
AccessorGroup : `{` `}`
```
1. Return EvaluateAutoAccessor(_object_, _name_, _initializer_).

```grammarkdown
AccessorGroup : `{` GetAccessorStub SetAccessorStub? `}`
AccessorGroup : `{` SetAccessorStub GetAccessorStub? `}`
```
1. Let _list_ be a new empty List.
2. Let _backingFieldName_ be a unique Private Name (steps TBD).
3. Let _backingField_ be a new ClassFieldDefinition Record { \[\[Name]]: _backingFieldName_, \[\[Initializer]]: _initializer_ }.
4. If _GetAccessorStub_ is present, then
    1. Let _getAccessor_ be ! DefineAccessorStub(_object_, _name_, ~get~, _backingFieldName_).
    2. If _getAccessor_ is not ~empty~, append _getAccessor_ to _list_.
5. If _SetAccessorStub_ is present, then
    1. If _SetAccessorStub_ is a _PublicSetAccessorStub_ symbol, then:
        1. Let _setAccessor_ be ! DefineAccessorStub(_object_, _name_, ~set~, _backingFieldName_).
    2. Else,
        2. Let _setAccessor_ be ! DefineAccessorStub(_object_, _name_, ~private-set~, _backingFieldName_).
    3. If _setAccessor_ is not ~empty~, append _setAccessor_ to _list_.
6. return _list_.

```grammarkdown
AccessorGroup : `{` GetAccessorMethod SetAccessorMethod? `}`
AccessorGroup : `{` SetAccessorMethod GetAccessorMethod? `}`
```
1. Assert: _initializer_ is ~empty~.
2. Let _list_ be a new empty List.
3. If _GetAccessorMethod_ is present, then
    1. Let _getAccessor_ be ? DefineAccessorMethod of _GetAccessorMethod_ with arguments _object_ and _name_.
    2. If _getAccessor_ is not ~empty~, append _getAccessor_ to _list_.
4. If _SetAccessorMethod_ is present, then
    1. Let _setAccessor_ be ? DefineAccessorMethod of _SetAccessorMethod_ with arguments _object_ and _name_.
    2. If _setAccessor_ is not ~empty~, append _setAccessor_ to _list_.
5. Return _list_.

### EvaluateAutoAccessor ( _object_, _name_, _initializer_ )

1. Let _list_ be a new empty List.
2. Let _backingFieldName_ be a unique Private Name (steps TBD).
3. Let _backingField_ be a new ClassFieldDefinition Record { \[\[Name]]: _backingFieldName_, \[\[Initializer]]: _initializer_ }.
4. Let _getAccessor_ be ! DefineAccessorStub(_object_, _name_, ~get~, _backingFieldName_).
5. Append _getAccessor_ to _list_.
6. Let _setAccessor_ be ! DefineAccessorStub(_object_, _name_, ~set~, _backingFieldName_).
7. Append _setAccessor_ to _list_.
8. return _list_.

### DefineAccessorStub ( _object_, _name_, _kind_, _backingFieldName_ )

1. If _kind_ is ~get~, then
    1. Return the result of defining a getter method on _object_ named _name_ that returns the value of _backingFieldName_ (steps TBD).
2. If _kind_ is ~set~, then
    1. Return the result of defining a setter method on _object_ named _name_ that returns the value of _backingFieldName_ (steps TBD).
3. If _kind_ is ~private-set~, then
    1. Assert: _name_ is not a Private NAme.
    2. Let _privateIdentifier_ be the string-concatenation of 0x0023 (NUMBER SIGN) and _name_.
    3. Let _privateName_ be a Private Name for _privateIdentifier_, similar to the steps for `ClassElementName : PrivateIdentifier` in 
       https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation (steps TBD).
    4. Return the result of defining a setter method on _object_ named _name_ that returns the value of _backingFieldName_ (steps TBD).

### DefineAccessorMethod

With arguments _object_ and _name_.

```grammarkdown
GetAccessorMethod : `get` `(` `)` `{` FunctionBody `}`
```
1. Return the result of defining a getter method on _object_ named _name_ whose body is _FunctionBody_ (steps TBD).

```grammarkdown
PublicSetAccessorMethod : `set` `(` PropertySetParameterList `)` `{` FunctionBody `}`
```
1. Return the result of defining a setter method on _object_ named _name_ with parameters _PropertySetParameterList_ and
    whose body is _FunctionBody_ (steps TBD).

```grammarkdown
PrivateSetAccessorMethod : `#set` `(` PropertySetParameterList `)` `{` FunctionBody `}`
```
1. Assert: _name_ is not a Private Name.
2. Return the result of defining a setter method on _object_ named _name_ with parameters _PropertySetParameterList_ and
    whose body is _FunctionBody_ (steps TBD).

# Interaction With Class `static {}` Initialization Block 

The initial proposal for this feature did not use the `accessor` keyword prefix to distinguish a grouped- or auto-accessor,
which lead to a collision with the [Class `static {}` Initialization Block proposal](https://github.com/tc39/proposal-class-static-block).
The current version now requires the `accessor` keyword and no longer conflicts with `static {}`.

# Interaction with Decorators

This proposal is intended to dovetail with the [Decorators proposal](https://github.com/tc39/proposal-decorators) and shares syntax with
[auto-accessors](https://github.com/tc39/proposal-decorators#class-auto-accessors) in that proposal. This proposal expands upon the Decorators
proposal in the following ways:

- By adding an _AccessorGroup_ to an _auto-accessor_, you are able to decorate both the entire `accessor` declaration as well as the 
 individual `get` and `set` method stubs:
    ```js
    class C {
        @dec1 // called as `dec1({ get, set }, context)`
        accessor x {
            @dec2 // called as `dec2(fn, context)`
            get;

            @dec3 // called as `dec3(fn, context)`
            set;
        }
    }
    ```
- A decorator on a _grouped accessor_ is able to access both the `get` and `set` declarations, similar to early decorator implementations in 
  TypeScript and Babel:
    ```js
    class C {
        @dec1 // called as `dec1({ get, set }, context)`
        accessor x {
            get() { ... }
            set(v) { ... }
        }

        @dec2 get y() { ... } // called as `dec2(fn, context)`
    }
    ```
- Similar to _auto-accessors_, _grouped accessors_ can be decorated both at the `accessor` declaration level and at the individual
  getter and setter declarations:
    ```js
    class C {
        @dec1 // called as `dec1({ get, set }, context)`
        accessor x {
            @dec2 // called as `dec2(fn, context)`
            get() { ... }

            @dec3 // called as `dec3(fn, context)`
            set(v) { ... }
        }
    }
    ```

In addition, some aspects of _auto-accessors_ that may at first seem like edge cases become powerful capabilities with decorators:

```js
// Get-only accessors

// an accessor with only a getter and no initializer is has limited use on its own...
class Service {
  accessor users { get; }
}

// ...however a decorator could be used to perform dependency injection by replacing the getter:
class Service {
  @inject("userService")
  accessor users { get; }
}


// Set-only accessors

// A setter with no getter is has limited use on its own...
class WriteOnlyCounter {
  accessor inc { set; } 
}

// ...however, a decorator can replace the setter to make it more useful:
class WriteOnlyCounter {
  @observeChanges()
  accessor inc { set; }
}


// Private-set-only accessors

// The following could have been written as `accessor #value { set; }`...
class Widget {
  accessor value { #set; }

  exec() {
    this.#value = ...;
  }
}

// ...however, a decorator here could attach a public getter, which
// it would not be able to do if `value` was named `#value` instead.
class Widget {
  @decorator
  accessor value { #set; }

  exec() {
    this.#value = ...;
  }
}
```

## Prior Art
- C# ([1](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/using-properties), [2](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/auto-implemented-properties))

# Examples

## Grouped Accessors

```js
class Point {
  #x = 0;
  #y = 0;

  accessor x {
    get() { return this.#x; }
    set(v) {
      if (typeof v !== "number") throw new RangeError();
      this.#x = v;
    }
  }

  accessor y {
    get() { return this.#y; }
    set(v) {
      if (typeof v !== "number") throw new RangeError();
      this.#y = v;
    }
  }
}
```

## Auto-Accessors

```js
class Customer {
  accessor id { get; #set; } // public get, private set
  accessor name;
  constructor(id, name) {
    this.#id = id;
    this.name = name;
  }
}
const c = new Customer(1, "Jane");
c.id; // 1
c.id = 2; // TypeError
```

# TODO

The following is a high-level list of tasks to progress through each stage of the [TC39 proposal process](https://tc39.github.io/process-document/):

### Stage 1 Entrance Criteria

* [x] Identified a "[champion][Champion]" who will advance the addition.  
* [x] [Prose][Prose] outlining the problem or need and the general shape of a solution.  
* [x] Illustrative [examples][Examples] of usage.  
* [ ] ~~High-level [API][API].~~  

### Stage 2 Entrance Criteria

* [ ] [Initial specification text][Specification].  
* [ ] [Transpiler support][Transpiler] (_Optional_).  

### Stage 3 Entrance Criteria

* [ ] [Complete specification text][Specification].  
* [ ] Designated reviewers have [signed off][Stage3ReviewerSignOff] on the current spec text.  
* [ ] The ECMAScript editor has [signed off][Stage3EditorSignOff] on the current spec text.  

### Stage 4 Entrance Criteria

* [ ] [Test262](https://github.com/tc39/test262) acceptance tests have been written for mainline usage scenarios and [merged][Test262PullRequest].  
* [ ] Two compatible implementations which pass the acceptance tests: [\[1\]][Implementation1], [\[2\]][Implementation2].  
* [ ] A [pull request][Ecma262PullRequest] has been sent to tc39/ecma262 with the integrated spec text.  
* [ ] The ECMAScript editor has signed off on the [pull request][Ecma262PullRequest].  
<!--#endregion:todo-->

[Process]: https://tc39.github.io/process-document/
[Proposals]: https://github.com/tc39/proposals/
[Grammarkdown]: http://github.com/rbuckton/grammarkdown#readme
[Champion]: #status
[Prose]: #motivations
[Examples]: #examples
[API]: #api
[Specification]: #todo
[Transpiler]: #todo
[Stage3ReviewerSignOff]: #todo
[Stage3EditorSignOff]: #todo
[Test262PullRequest]: #todo
[Implementation1]: #todo
[Implementation2]: #todo
[Ecma262PullRequest]: #todo
