# c2j
marshal/unmarshal json to c function, gen json to struct &amp; functions


## header
1. __desc : copy to header / source file, most of case is license
2. __file : output file prefix, for example: exam_c2j_out.h, exam_c2j_out.c
3. __prefix : prefix for marshal prefix, left in blank if don't want
4. __inclde : include project header files
5. __sysinclude : include system header files

```json
{
    "__desc":"copy to header of header file",
    "__file":"exam",
    "__prefix":"exam_",
    "__include":[
        "list.h",
        "cJSON.h"
    ],
    "__sysinclude":[
        "stdio.h",
        "string.h",
        "stdbool.h"
    ],
}
```

## struct
1. types : bool, int, double, struct list_head(for array), struct xxxx(nested object)
2. array : all array in struct list_head double link list,(code snip from linux kernel)
3. nested : not support, only decl it in plate, details in example.json 
```json
{
    "subobj":{
        "node":"struct list_head",
        "type_double":"double",
        "type_string":"string"
    },

    "example":{
        "type_bool":"bool",
        "type_int":"int",
        "type_double":"double",
        "type_string":"string",
        "type_binary":"binary",

        "type_object":"struct subobj",
        "type_list":["struct subobj"]
    }
}
```
## api
1. prefix_xxxx_new, prefix_xxxx_free : alloc /free c struct
2. prefix_xxxx_j2c, prefix_xxxx_j2c_cjs : json string / object to c struct
3. prefix_xxxx_c2j, prefix_xxxx_c2j_cjs : c struck to json string / object

## hook
1. memory : c2j__hook_malloc, c2j__hook_free, memory manager
2. log : c2j__hook_printf, lik printf
3. base64 : c2j__hook_base64_decode, c2j__hook_base64_encode, base64 api

## usage
1. ./c2j.js api.json outputdir
2. xxx_c2j_out.h, header file of interface
3. xxx_c2j_out.c, source file of interface
4. c2j_hook.h, c2j_hook.c, interface used by c2j internal

## deps
1. list.h, from linux kernal
2. cJSON, marshal/unmarshal
3. base64, base64 encode/decode for binary
