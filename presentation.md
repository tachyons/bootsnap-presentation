## Behind the scenes of Bootsnap

---

## Aboobacker MK

### Software Engineer

---

## Life of a ruby program

---

!['tokenize.png'](tokenize.png)

---
```ruby
require 'ripper'
require 'pp'
code = <<CODE
def add(x, y)
  x + y
end
CODE
```

---
```ruby
irb(main):043:0> Ripper.tokenize code
=> ["def", " ", "add", "(", "x", ",", " ", "y", ")", "\n", "x", " ", "+", " ", "y", "\n", "end", "\n"]
```
---
```ruby
irb(main):042:0> pp Ripper.sexp(code)
[:program,
 [[:def,
   [:@ident, "add", [1, 4]],
   [:paren,
    [:params,
     [[:@ident, "x", [1, 8]], [:@ident, "y", [1, 11]]],
     nil,
     nil,
     nil,
     nil,
     nil,
     nil]],
   [:bodystmt,
    [[:binary,
      [:var_ref, [:@ident, "x", [2, 0]]],
      :+,
      [:var_ref, [:@ident, "y", [2, 4]]]]],
    nil,
    nil,
```
---
### Abstract Syntax Tree
![Abstract syntax tree](ast2.png)

Ref: Ruby Under a microscope

---
YARV code
```
irb(main):052:0> puts RubyVM::InstructionSequence.compile(code).disasm
== disasm: #<ISeq:<compiled>@<compiled>:1 (1,0)-(3,3)> (catch: FALSE)
0000 definemethod                           :add, add                 (   1)[Li]
0003 putobject                              :add
0005 leave

== disasm: #<ISeq:add@<compiled>:1 (1,0)-(3,3)> (catch: FALSE)
local table (size: 2, argc: 2 [opts: 0, rest: -1, post: 0, block: -1, kw: -1@-1, kwrest: -1])
[ 2] x@0<Arg>   [ 1] y@1<Arg>
0000 getlocal_WC_0                          x@0                       (   2)[LiCa]
0002 getlocal_WC_0                          y@1
0004 opt_plus                               <calldata!mid:+, argc:1, ARGS_SIMPLE>
0006 leave                                                            (   3)[Re]
=> nil
```
---




```bash
➜ cat example.rb
number = 23
puts number + 23
➜ ruby -e "File.write('example.bin', 
RubyVM::InstructionSequence.compile_file('example.rb')
.to_binary)"
➜ cat example.bin
YARB@
     �x86_64-darwin18%�#�%�gw
numberE+Eexampleputs���������%
```
---
```ruby
irb(main):018:0>  RubyVM::InstructionSequence.load_from_binary(File.read('example.bin')).eval
46
```
---
Machine dependent, can't transfer

Programatically load

Read Iseq from files

bootsnap and yumiomu

Instruction elimination

---
Let's talk about `require`

```ruby
def require(file_name)
  eval File.read(filename)
end
```
---

- What if we rewuire twice? 
---

```ruby
  $LOADED_FEATURES = []
  def require(filename)
    return false if $LOADED_FEATURES.include?(filename)
    eval File.read(filename)
    $LOADED_FEATURES << filename
  end
```
---
Absolute paths only ?

---

```ruby
  $LOAD_PATH = []

  def require(filename)
    full_path = $LOAD_PATH.take do |path|
      File.exist?(File.join(path, filename))
    end

    eval File.read(full_path)
  end
```
---
```bash
irb(main):054:0>  $LOADED_FEATURES.count
=> 6552
```

```ruby
irb(main):058:0> $LOAD_PATH.count
=> 779
```
---
### Redundant io operations
---
## Bootsnap

- Path Pre-Scanning
- compilation Caching
---
### Path prescanning

- Kernel#require and Kernel#load are modified to eliminate $LOAD_PATH scans
- ActiveSupport::Dependencies.{autoloadable_module?,load_missing_constant,depend_on} are overridden to eliminate scans of ActiveSupport::Dependencies.autoload_paths. 

---

### Compilation Caching

- RubyVM::InstructionSequence.load_iseq is implemented to cache the result of Ruby bytecode compilation
- YAML.load_file is modified to cache the result of loading a YAML object in MessagePack format (or Marshal, if the message uses types unsupported by MessagePack)
---

---

## PATH prescanning
$LOAD_PATH = [app, lib, gem1/lib]

```
open app/foo.rb # (fail)
# (imagine this with 500 $LOAD_PATH entries instead of three)
open lib/foo.rb # (success)
close lib/foo.rb
open lib/foo.rb
```

---
```ruby
 def require(filename)
    if $CACHED_PATH[file_name]
      full_path = $CACHED_PATH[filename]
    else
      full_path = $LOAD_PATH.take do |path|
        File.exist?(File.join(path, filename))
      end
    end

    eval File.read(full_path)
 end
```
---
ActiveSupport::Dependencies.autoload_paths
---

## Cache Invalidation

- Stable (Ruby installation path and Gem path)
- Volatile (Everything else)
---
## Caching LoadErrors

---
```ruby
module InstructionSequenceMixin
    def load_iseq(path)
      # Having coverage enabled prevents iseq dumping/loading.
      return nil if defined?(Coverage) && Bootsnap::CompileCache::Native.coverage_running?

      Bootsnap::CompileCache::ISeq.fetch(path.to_s)
    rescue Errno::EACCES
      Bootsnap::CompileCache.permission_error(path)
    rescue RuntimeError => e
      if e.message =~ /unmatched platform/
        puts("unmatched platform for file #{path}")
      end
      raise
    end
  end
```
---
```ruby
def self.fetch(path, cache_dir: ISeq.cache_dir)
  Bootsnap::CompileCache::Native.fetch(
    cache_dir,
    path.to_s,
    Bootsnap::CompileCache::ISeq,
    nil,
  )
end
```