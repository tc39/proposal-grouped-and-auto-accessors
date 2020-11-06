# Grouped Accessors and Auto-Accessors for ECMAScript

This introduces new syntax for _grouped accessors_ and _auto-accessors_ to classes and object literals. 
A _grouped accessor_ is a single declaration that contains either or both both of the `get` and `set` methods for an accessor. 
An _auto-accessor_ is a simplified variant of a _grouped accessor_ that elides the bodies of the `get` and `set` methods and
introduces a private backing field used by both the getter and setter.

## Status

**Stage:** 0  
**Champion:** Ron Buckton (@rbuckton)  

_For detailed status of this proposal see [TODO](#todo), below._  

## Authors

* Ron Buckton (@rbuckton)  

## Syntax - Grouped Accessors

```js
class C {
  x {
    get() { ... } // equivalent to `get x() { ... }`
    set(value) { ... } // equivalent to `set x(value) { ... }`
  }
}

const obj = {
  x {
    get() { ... }
    set() { ... }
  }
};
```

A grouped accessor is essentially a way to define either one or both of the `get` and `set` methods of an accessor. This provides 
the following benefits:
- The `get` and `set` are logically grouped together, which can improve readability.
- A grouped `get` and `set` accessor pair with a computed property name needs to only have the name evaluated once.
- A decorator applied to the group could observe both the `get` and `set` methods simultaneously, for example:
  ```js
  function dec({ get, set }, context) {
    ...
    return { get, set, };
  }
  class C {
    @dec
    x {
      get() { ... }
      set(value) { ... }
    }
  ```

The semantics of a grouped accessor are as follows:
- It is a syntax error if a grouped accessor shares the name of another member with the same placement on the class 
  (i.e. `static` vs. non-`static`):
  ```js
  class C {
    x { get() { ... } }
    set x(value) { ... } // Syntax error

    y { get() { ... } }
    y { set(value) { ... } } // Syntax error
  }
  ```
- A grouped accessor can specify either a `get`, a `set`, or both in any order.
- A grouped accessor cannot specify more than one `get` or `set`.
- Otherwise, they are defined on the class in the same way that the individual declarations would have been.

## Syntax - Auto-Accessors

```js
class C {
  x { get; set; } = 1;
  y { get; } = 2;
  z { get; #set; } = 3;
  constructor() {
    this.#z = 4;
  }
}

const obj = {
  x { get; set; }: 1,
  y { get; }: 2
}
```

An auto-accessor is a simplified version of a grouped accessor that allows you to elide the body of the `get` 
and `set` methods, and optionally provide an initializer. An auto-initializer introduces a unique private field on 
the class which is wrapped by a non-private getter and optional non-private setter. `#set` entry indicates a 
private setter of the same name as the public member exists on the object and provides privileged access to set the 
underlying value.

This provides the following benefits:
- Introduces accessors that can be overridden in subclasses without excess boilerplate.
- Provides a replacement for fields that allows you to observe reading and writing the value of the field with decorators.
- Allows you to perform initialization inline with the declaration, similar to fields.


## Prior Art
- C# ([1](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/using-properties), [2](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/auto-implemented-properties))

# Examples

## Grouped Accessors

```js
class Point {
  #x = 0;
  #y = 0;

  x {
    get() { return this.#x; }
    set(v) {
      if (typeof v !== "number") throw new RangeError();
      this.#x = v;
    }
  }

  y {
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
  id { get; #set; } // public get, private set
  name { get; set; }
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
