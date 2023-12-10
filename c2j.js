

const fs = require('fs');
const proc = require('process');

var kPrefix = "c2j_";
const kSourceTemplate = `
static int j2c_bool_cjs(cJSON *cjs, const char *item, bool *out){
    cJSON *cjs_item = NULL;
    int rc = 0;

    if(cJSON_HasObjectItem(cjs, item)){
        cjs_item = cJSON_GetObjectItem(cjs, item);
        if(cJSON_IsBool(cjs_item)){
            if(cJSON_IsFalse(cjs_item)){
                *out = 0;
            }else{
                *out = 1;
            }
            rc = 0;
        }else{
            c2j__hook_printf("%s not number!\\n", item);
            rc = -1;
        }
    }

    return rc;
}

static int c2j_bool_cjs(cJSON *cjs, const char *item, int in){
    if(cJSON_AddBoolToObject(cjs, item, in) == NULL){
        c2j__hook_printf("cJSON_CreateBool object fail:%s\\n", item);
        return -1;
    }

    return 0;
}

static int j2c_int_cjs(cJSON *cjs, const char *item, int *out){
    cJSON *cjs_item = NULL;
    int rc = 0;

    if(cJSON_HasObjectItem(cjs, item)){
        cjs_item = cJSON_GetObjectItem(cjs, item);
        if(cJSON_IsNumber(cjs_item)){
            *out = (int)cJSON_GetNumberValue(cjs_item);
            rc = 0;
        }else{
            c2j__hook_printf("%s not number!\\n", item);
            rc = -1;
        }
    }

    return rc;
}

static int c2j_int_cjs(cJSON *cjs, const char *item, int in){
    if(cJSON_AddNumberToObject(cjs, item, (double)in) == NULL){
        c2j__hook_printf("cJSON_CreateNumber number object fail:%s\\n", item);
        return -1;
    }

    return 0;
}

static int j2c_double_cjs(cJSON *cjs, const char *item, double *out){
    cJSON *cjs_item = NULL;
    int rc = 0;

    if(cJSON_HasObjectItem(cjs, item)){
        cjs_item = cJSON_GetObjectItem(cjs, item);
        if(cJSON_IsNumber(cjs_item)){
            *out = cJSON_GetNumberValue(cjs_item);
            rc = 0;
        }else{
            c2j__hook_printf("%s not number!\\n", item);
            rc = -1;
        }
    }

    return rc;
}

static int c2j_double_cjs(cJSON *cjs, const char *item, double in){
    if(cJSON_AddNumberToObject(cjs, item, in) == NULL){
        c2j__hook_printf("cJSON_CreateNumber number object fail:%s\\n", item);
        return -1;
    }

    return 0;
}

static int j2c_string_cjs(cJSON *cjs, const char *item, char **out){
    cJSON *cjs_item = NULL;
    int rc = 0;

    if(cJSON_HasObjectItem(cjs,item)){
        cjs_item = cJSON_GetObjectItem(cjs, item);
        if(cJSON_IsString(cjs_item)){
            *out = cJSON_GetStringValue(cjs_item);
        }else{
            c2j__hook_printf("%s not string!\\n", item);
            return -1;
        }
    }

    return rc;
}

static int c2j_string_cjs(cJSON *cjs, const char *item, const char *in){
    if(cJSON_AddStringToObject(cjs, item, in) == NULL){
        c2j__hook_printf("cJSON_CreateNumber string object fail:%s\\n", item);
        return -1;
    }

    return 0;
}

static int j2c_binary_cjs(cJSON *cjs, const char *item, void **out, int *len){
    cJSON *cjs_item = NULL;
    int rc = 0;

    if(cJSON_HasObjectItem(cjs, item)){
        cjs_item = cJSON_GetObjectItem(cjs, item);
        if(cJSON_IsString(cjs_item)){
            char *binstr = cJSON_GetStringValue(cjs_item);
            *out = c2j__hook_malloc(strlen(binstr));
            if(*out == NULL){
                c2j__hook_printf("%s convert no more memory!\\n", item);
                c2j__hook_free(binstr);
                return -1;
            }

            if(c2j__hook_base64_decode(binstr, *out, len)){
                c2j__hook_printf("%s base64 decode fail!\\n", item);
                c2j__hook_free(binstr);
                c2j__hook_free(*out);
                return -1;
            }
            c2j__hook_free(binstr);
            rc = 0;
        }else{
            c2j__hook_printf("%s not string!\\n", item);
            return -1;
        }
    }

    return rc;
}

static int c2j_binary_cjs(cJSON *cjs, const char *item, const void *in, int len){
    cJSON *ji;
    char *b64str = c2j__hook_malloc(len * 3 / 2); // expand 1.5 times memory size
    if(b64str == NULL){
        c2j__hook_printf("no more memory for %s!\\n", item);
        return -1;
    }
    
    if(c2j__hook_base64_encode(in, len, b64str, len*3/2) != 0){
        c2j__hook_printf("%s base64 encode fail!\\n", item);
        c2j__hook_free(b64str);
        return -1;
    }

    ji = cJSON_AddStringToObject(cjs, item, b64str);
    c2j__hook_free(b64str);
    if(ji == NULL){
        c2j__hook_printf("cJSON_CreateNumber binary object fail:%s\\n", item);
        return -1;
    }

    return 0;
}

// json to object item
#define J2C_OBJECT_CJS(__cjs,__item,__out,PREFIX,OBJECT_TYPE)   \\
do{ \\
    cJSON *cjs_item = NULL; \\
    \\
    if(cJSON_HasObjectItem(__cjs, __item)){ \\
        cjs_item = cJSON_GetObjectItem(__cjs, __item);  \\
        if(cJSON_IsObject(cjs_item)){   \\
            if(PREFIX##OBJECT_TYPE##_j2c_cjs(cjs_item, *__out) != 0){   \\
                c2j__hook_printf("%s decode fail!\\n", __item);  \\
                return -1;  \\
            }   \\
        }else{  \\
            c2j__hook_printf("%s not object!\\n", __item);   \\
            return -1;  \\
        }   \\
    }   \\
}while(0)

// object item to json
#define C2J_OBJECT_CJS(__cjs,__item,__in,PREFIX,OBJECT_TYPE)   \\
do{ \\
    cJSON *oj = cJSON_CreateObject();   \\
    int rc; \\
    \\
    rc = PREFIX##OBJECT_TYPE##_c2j_cjs(__in,oj);    \\
    if(rc != 0){    \\
        c2j__hook_printf("c2j %s fail!\\n", __item);    \\
        cJSON_Delete(oj);  \\
        cJSON_Delete(__cjs);  \\
        return -1;  \\
    }   \\
    \\
    if(cJSON_AddItemToObject(__cjs, __item, oj)){   \\
        c2j__hook_printf("add %s to parent fail!\\n", __item);  \\
        cJSON_Delete(oj);  \\
        cJSON_Delete(__cjs);  \\
        return -1;  \\
    }   \\
}while(0)

#define J2C_ARRAY_CJS(__cjs,__item,__out,PREFIX,OBJECT_TYPE)    \\
do{     \\
    cJSON *cjs_item = NULL;     \\
    cJSON *cjs_ary = NULL;      \\
    if(cJSON_HasObjectItem(__cjs, __item)){     \\
        cjs_ary = cJSON_GetObjectItem(__cjs, __item);   \\
        if(!cJSON_IsArray(cjs_ary)){    \\
            c2j__hook_printf("%s not array!\\n", __item);  \\
            return -1;  \\
        }   \\
        for(int i = 0; i < cJSON_GetArraySize(cjs_ary); i++){   \\
            cjs_item = cJSON_GetArrayItem(cjs_ary, i);  \\
            struct OBJECT_TYPE *node = PREFIX##OBJECT_TYPE##_new();   \\
            if(node == NULL){   \\
                c2j__hook_printf("%s no more memory for list!\\n", __item);    \\
                return -1;  \\
            }   \\
            if(PREFIX##OBJECT_TYPE##_j2c_cjs(cjs_item, node) != 0){ \\
                c2j__hook_printf("%s list item convert fail!\\n", __item);   \\
                PREFIX##OBJECT_TYPE##_free(node);   \\
                return -1;  \\
            }   \\
            list_add(__out, &node->node);   \\
        }   \\
    }   \\
}while(0)

#define C2J_ARRAY_CJS(__cjs,__item,__in,PREFIX,OBJECT_TYPE)    \\
do{ \\
    struct OBJECT_TYPE *pos; \\
    int rc; \\
    cJSON *oja = cJSON_CreateObject();  \\
    if(oja == NULL){    \\
        c2j__hook_printf("c2j new array object fail!\\n");    \\
        cJSON_Delete(__cjs);  \\
        return -1;  \\
    }   \\
    \\
    list_for_each_entry(pos, __in, node){   \\
        cJSON *oj = cJSON_CreateObject();   \\
        cJSON_AddItemToArray(oja, oj);  \\
        rc = PREFIX##OBJECT_TYPE##_c2j_cjs(pos,oj);    \\
        if(rc != 0){    \\
            cJSON_Delete(oja);  \\
            cJSON_Delete(__cjs);  \\
            c2j__hook_printf("c2j %s sub node fail!\\n", __item);    \\
            return -1;  \\
        }    \\
    }   \\
    \\
    if(!cJSON_AddItemToObject(__cjs,__item,oja)){   \\
        cJSON_Delete(oja);  \\
        cJSON_Delete(__cjs);  \\
        c2j__hook_printf("c2j add %s parent fail!\\n", __item);    \\
        return -1;  \\
    }   \\
}while(0)


#define FREE_ARRAY(__in,PREFIX,OBJECT_TYPE)    \\
do{\\
    struct OBJECT_TYPE *pos, *n;    \\
    list_for_each_entry_safe(pos, n, __in, node){   \\
        list_del(&pos->node);   \\
        PREFIX##OBJECT_TYPE##_free(pos);  \\
    }   \\
}while(0)
`

const kHookHeader = `
/* gen by c2j.js, DON\'T modify it */

#ifdef __cplusplus
extern "C" {
#endif

#ifndef __C2J_HOOK_H__
#define __C2J_HOOK_H__
#endif

#include <stddef.h>

void *c2j__hook_malloc(size_t size);
void c2j__hook_free(void *ptr);

int c2j__hook_printf(const char *format, ...);

int c2j__hook_base64_decode(const void *binstr, void *out, int *len);
int c2j__hook_base64_encode(const void *in, int inlen, char *b64str, int len);

#ifdef __cplusplus
}
#endif
`
const kHookSource = `

#include <stdarg.h>
#include <stdlib.h>

#include "c2j_hook.h"

void *c2j__hook_malloc(size_t size){
    return malloc(size);
}

void c2j__hook_free(void *ptr){
    return free(ptr);
}


int c2j__hook_printf(const char *format, ...){
    va_list args;
    int rc;

    va_start(args, format);
    rc = printf(format, args);
    va_end(args);

    return rc; 
}

int c2j__hook_base64_decode(const void *binstr, void *out, int *len){
    return 0;
}

int c2j__hook_base64_encode(const void *in, int inlen, char *b64str, int len){
    return 0;
}
`

function load_json(json_file){
    var data = fs.readFileSync(json_file, { encoding: 'utf8', flag: 'r' });
    
    if(data == null){
        console.log("file not exists:", json_file)
        proc.exit(1);
    }

    return JSON.parse(data)
}

function list_type(jobj){
    if((typeof(jobj) == "object") && (Array.isArray(jobj))){
        return jobj[0];
    }

    return null;
}

function item_type(str){
    var items = str.split(' ');

    if(items[0] == "struct")
        return items[0] + ' ' + items[1];

    return items[0];
}

function item_type_name(str){
    var items = str.split(' ');

    if(items[0] == "struct")
        return items[1];

    return null;
}

function c2j_gen_header(name, jobj){
    var c_struct = '\nstruct ' + name + "{\n";

    // struct
    for (key in jobj) {
        var type = '';

        var ary = list_type(jobj[key]);
        if(ary != null){    // list array
            c_struct += '\tstruct list_head ' + key + ';' + '   // ' + ary + ', array\n';
            continue;
        }

        type = item_type(jobj[key]);

        if(type == "binary"){
            c_struct += '\tvoid *' + key + ';\n';
            c_struct += '\tint ' + key + '_len;\n';
        }else if(type == "string"){
            c_struct += '\tchar *' + key + ';\n';
        }else if(item_type_name(type) != null){ // object
            if(item_type_name(type) == "list_head"){    // list node
                c_struct += '\t' + type + ' ' + key + ';\n';
            }else{
                c_struct += '\t' + type + ' *' + key + ';\n';
            }
        }else{
            c_struct += '\t' + type + ' ' + key + ';\n';
        }
    }
    c_struct += '};\n';

    // interface
    var type_name = "struct " + name;
    c_struct += type_name + ' *' + kPrefix + name + "_new();\n";
    c_struct += 'void ' + kPrefix + name + "_free(" + type_name + " *ptr);\n";

    c_struct += 'int ' + kPrefix + name + "_j2c(const char *json, int len, " + type_name + " *ptr);\n";
    c_struct += 'int ' + kPrefix + name + "_c2j(" + type_name + " *ptr, char **json);\n";

    c_struct += 'int ' + kPrefix + name + "_j2c_cjs(cJSON *cjs, " + type_name + " *ptr);\n";
    c_struct += 'int ' + kPrefix + name + "_c2j_cjs(" + type_name + " *ptr, cJSON *cjs);\n";

    return c_struct + '\n';
}

function c2j_gen_source(name, jobj){
    var type_name = 'struct ' + name;

    const new_template = `
${type_name} *${kPrefix}${name}_new(){
    ${type_name} *ptr;
    
    ptr = (${type_name} *)c2j__hook_malloc(sizeof(${type_name}));
    if(ptr == NULL){
        c2j__hook_printf("no more memory for ${name} new!\\n");
        return NULL;
    }
    
    return ptr;
}`;

    const j2c_template = `
int ${kPrefix}${name}_j2c(const char *json, int len, ${type_name} *ptr){
    cJSON *cjs = cJSON_ParseWithLength(json, (size_t)len);
    if(cjs == NULL){
        c2j__hook_printf("parse json string fail!\\n");
        return -1;
    }

    return ${kPrefix}${name}_j2c_cjs(cjs, ptr);
}
`

    const c2j_template = `
int ${kPrefix}${name}_c2j(${type_name} *ptr, char **json){
    cJSON *cjs = cJSON_CreateObject();
    int rc;

    rc = ${kPrefix}${name}_c2j_cjs(ptr, cjs);
    if(rc != 0){
        c2j__hook_printf("convert ${name} to cJSON object fail!\\n");
        return -1;
    }

    *json = cJSON_PrintUnformatted(cjs);
    cJSON_Delete(cjs);

    if(*json == NULL){
        c2j__hook_printf("convert ${name} to cJSON string fail!\\n");
        return -1;
    }

    return 0;
}
`

    var free_str = '';
    var j2c_cjs = '';
    var c2j_cjs = '';
    for (key in jobj) {
        var type = '';

        var ary = list_type(jobj[key]);
        if(ary != null){    // list array
            var tname = item_type_name(ary)
            
            j2c_cjs += `
    J2C_ARRAY_CJS(cjs,"${key}",&ptr->${key},${kPrefix},${tname});
`
            c2j_cjs += `
    C2J_ARRAY_CJS(cjs,"${key}",&ptr->${key},${kPrefix},${tname});
`
            free_str += `
    FREE_ARRAY(&ptr->${key},${kPrefix},${tname});
`
            continue;
        }

        type = item_type(jobj[key]);

        if(type == "binary"){
            j2c_cjs += `
    if(j2c_binary_cjs(cjs, "${key}", &ptr->${key}, &ptr->${key}_len) != 0){
        return -1;
    }
`
            c2j_cjs += `
    if(c2j_binary_cjs(cjs, "${key}", ptr->${key}, ptr->${key}_len) != 0){
        return -1;
    }
`
            free_str += `
    if(ptr->${key} != NULL){
        c2j__hook_free(ptr->${key});
        ptr->${key} = NULL;
        ptr->${key}_len = 0;
    }
`
        }else if(type == "string"){
            j2c_cjs += `
    if(j2c_string_cjs(cjs, "${key}", &ptr->${key}) != 0){
        return -1;
    }
`
            c2j_cjs += `
    if(c2j_string_cjs(cjs, "${key}", ptr->${key}) != 0){
        return -1;
     }
`
            free_str += `
    if(ptr->${key} != NULL){
        c2j__hook_free(ptr->${key});
        ptr->${key} = NULL;
    }
`
        }else if(type == "double"){
            j2c_cjs += `
    if(j2c_double_cjs(cjs, "${key}", &ptr->${key}) != 0){
        return -1;
    }
`            
            c2j_cjs += `
    if(c2j_double_cjs(cjs, "${key}", ptr->${key}) != 0){
        return -1;
    }
`
        }else if(type == "int"){
            j2c_cjs += `
    if(j2c_int_cjs(cjs, "${key}", &ptr->${key}) != 0){
        return -1;
    }
`
            c2j_cjs += `
    if(c2j_int_cjs(cjs, "${key}", ptr->${key}) != 0){
        return -1;
    }
`
        }else if(item_type_name(type) != null){

            if(item_type_name(type) == "list_head"){
                continue; // ignore list_head
            }
            var tname = item_type_name(type)

            j2c_cjs += `
    J2C_OBJECT_CJS(cjs,"${key}",&ptr->${key},${kPrefix},${tname});
`
            c2j_cjs += `
    C2J_OBJECT_CJS(cjs,"${key}",ptr->${key},${kPrefix},${tname});
`
            free_str += `
    ${kPrefix}${tname}_free(ptr->${key});
    ptr->${key} = NULL;
`
        }else if(type == "bool"){
            j2c_cjs += `
    if(j2c_bool_cjs(cjs, "${key}", &ptr->${key}) != 0){
        return -1;
    }
`
            c2j_cjs += `
    if(c2j_bool_cjs(cjs, "${key}", ptr->${key}) != 0){
        return -1;
    }
`
        }else{
            console.log("unkown type of element:", key);
        }
    }

    const j2c_cjs_template = `
int ${kPrefix}${name}_j2c_cjs(cJSON *cjs, ${type_name} *ptr){
    ${j2c_cjs}

    return 0;
}
`

    const c2j_cjs_template = `
int ${kPrefix}${name}_c2j_cjs(${type_name} *ptr, cJSON *cjs){
        ${c2j_cjs}
       
    return 0;
}
`

const free_template = `
void ${kPrefix}${name}_free(${type_name} *ptr){
    if(ptr == NULL)
        return;
    ${free_str}
    c2j__hook_free(ptr);
    ptr = NULL;
}
`

    return {new_str:new_template, free_str:free_template, j2c_str:j2c_template, c2j_str:c2j_template, j2c_cjs:j2c_cjs_template, c2j_cjs:c2j_cjs_template};
}

function c2j_gen_header_file(jobj){
    var outfile = 'c2j_out';
    var c_header = '/* gen by c2j.js, DON\'T modify it! */\n';
    // 
    if(typeof(jobj["__desc"]) == "string"){
        c_header += "/*" + jobj.__desc + "*/\n";
    }
    c_header += "\n";

    if(typeof(jobj["__file"]) == "string"){
        outfile = jobj.__file;
    }

    if(typeof(jobj["__prefix"]) == "string"){
        kPrefix = jobj.__prefix;
    }
    
    const header_def = "__" + outfile.toUpperCase() + "_H__";
    c_header += "\
#ifndef " + header_def + "\n\
#define " + header_def + "\n\n";

    c_header += "\
#ifdef __cplusplus\n\
extern \"C\" {\n\
#endif // __cplusplus\n\n";

    if(typeof(jobj["__sysinclude"]) == "object"){
        for(key in jobj.__sysinclude){
            c_header += "#include <" + jobj.__sysinclude[key] + ">\n";
        }
    }
    c_header += "\n";

    if(typeof(jobj["__include"]) == "object"){
        for(key in jobj.__include){
            c_header += "#include \"" + jobj.__include[key] + "\"\n";
        }
    }
    c_header += "\n";

    //
    for(key in jobj){
        if(key.substring(0, 2) == "__"){
            continue;
        }

        if(typeof(jobj[key]) != "object"){
            console.log("item not object : ", key);
            continue;
        }

        c_header += c2j_gen_header(key, jobj[key]);
    }

    c_header += "\n\
#ifdef __cplusplus\n\
}\n\
#endif // __cplusplus\n\
\n\
#endif\n\n";

    fs.writeFileSync(outfile + '_c2j_out.h', c_header, {encoding:'utf8',flush:true,flag:'w'})
}

function c2j_gen_source_file(jobj){
    var outfile = 'c2j_out';
    var c_source = '/* gen by c2j.js, DON\'T modify it! */\n';

    // 
    if(typeof(jobj["__desc"]) == "string"){
        c_source += "/*" + jobj.__desc + "*/\n";
    }
    c_source += "\n";

    if(typeof(jobj["__file"]) == "string"){
        outfile = jobj.__file;
    }

    c_source += `
#include "${outfile}_c2j_out.h"
#include "c2j_hook.h"
`

    if(typeof(jobj["__prefix"]) == "string"){
        kPrefix = jobj.__prefix;
    }
    
    c_source += "\n";

    c_source += kSourceTemplate;

    //
    for(key in jobj){
        if(key.substring(0, 2) == "__"){
            continue;
        }

        if(typeof(jobj[key]) != "object"){
            console.log("item not object : ", key);
            continue;
        }

        var src_gen = c2j_gen_source(key, jobj[key]);

        c_source += src_gen.new_str;
        c_source += src_gen.free_str;

        c_source += src_gen.j2c_cjs;
        c_source += src_gen.j2c_str;
        c_source += src_gen.c2j_cjs;
        c_source += src_gen.c2j_str;
    }

    fs.writeFileSync(outfile + '_c2j_out.c', c_source, {encoding:'utf8',flush:true,flag:'w'})
}

function c2j_gen_hook(){
    fs.writeFileSync('c2j_hook.h', kHookHeader, {encoding:'utf8',flush:true,flag:'w'})

    if(!fs.existsSync('c2j_hook.c'))
        fs.writeFileSync('c2j_hook.c', kHookSource, {encoding:'utf8',flush:true,flag:'wx+'})
}

const jobj = load_json("example.json")

c2j_gen_header_file(jobj);
c2j_gen_source_file(jobj);
c2j_gen_hook();
