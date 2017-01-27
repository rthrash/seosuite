SeoSuite.grid.Urls = function(config) {
    config = config || {};
    if (!config.id) {
        config.id = 'seosuite-grid-urls';
    }
    Ext.applyIf(config,{
        id: config.id
        ,url: SeoSuite.config.connectorUrl
        ,baseParams: {
            action: 'mgr/url/getlist'
        }
        ,fields: ['id','url','solved','redirect_to','redirect_to_text','suggestions_text']
        ,autoHeight: true
        ,paging: true
        ,remoteSort: true
        ,viewConfig: {
            forceFit: true,
            getRowClass: function (record, index, rowParams, store)
            {
                var clsName = 'seosuite-row';
                if (record.json.solved) {
                    clsName += ' seosuite-solved';
                }
                return clsName;
            }
        }
        ,columns: [{
            header: _('seosuite.url.url')
            ,dataIndex: 'url'
            ,width: 300
        },{
            header: _('seosuite.url.solved')
            ,dataIndex: 'solved'
            ,renderer: this.renderBoolean
            ,width: 60
        },{
            header: _('seosuite.url.redirect_to')
            ,dataIndex: 'redirect_to_text'
            ,width: 160
        },{
            header: _('seosuite.url.suggestions')
            ,dataIndex: 'suggestions_text'
            ,width: 180
        }]
        ,tbar: [{
            xtype: 'button',
            text: '<i class="icon icon-upload"></i>&nbsp;&nbsp;' + _('seosuite.url.import'),
            handler: function(btn, e){
                this.importUrls = MODx.load({
                    xtype: 'seosuite-window-import',
                    hideUpload: false,
                    title: _('seosuite.url.import'),
                    listeners: {
                        'beforeSubmit': {fn:function() {
                            var topic = '/seosuiteimport/';
                            var register = 'mgr';
                            
                                this.console = MODx.load({
                                    xtype: 'modx-console',
                                    register: register,
                                    topic: topic,
                                    show_filename: 0
                                });
                            
                            this.console.show(Ext.getBody());
                        },scope:this},
                        'success': {fn:function(data) { 
                            this.refresh();
                        },scope:this}

                    }
                });

                this.importUrls.fp.getForm().reset();
                this.importUrls.show(e.target);
            },
            cls: 'container'
        },'->',{
            xtype: 'modx-combo'
            ,width: 130
            ,name: "solved"
            ,id: config.id + '-solved-field'
            ,hiddenName: "solved"
            ,store: new Ext.data.SimpleStore({
                data: [
                    ['1', 'Yes'],
                    ['0', 'No']
                ],
                id: 0,
                fields: ["value", "text"]
            })
            ,valueField: "value"
            ,displayField: "text"
            ,forceSelection: true
            ,triggerAction: "all"
            ,editable: true
            ,mode: "local"
            ,emptyText: _('seosuite.url.solved')
            ,listeners: {
                'select': {
                    fn:this.filter,scope: this
                }
            }
        },{
            xtype: 'textfield'
            ,width: 180
            ,name: "query"
            ,id: config.id + '-search-field'
            ,emptyText: _('search') + '...'
            ,listeners: {
                'change': {fn:this.filter,scope:this}
                ,'render': {fn: function(cmp) {
                    new Ext.KeyMap(cmp.getEl(), {
                        key: Ext.EventObject.ENTER
                        ,fn: function() {
                            this.fireEvent('change',this);
                            this.blur();
                            return true;
                        }
                        ,scope: cmp
                    });
                },scope:this}
            }
        },{
            xtype: 'button',
            id: config.id + '-search-clear',
            text: '<i class="icon icon-times"></i>',
            listeners: {
                click: {
                    fn: this.clearFilter, scope: this
                }
            }  
        }]
    });
    SeoSuite.grid.Urls.superclass.constructor.call(this,config);
};
Ext.extend(SeoSuite.grid.Urls,MODx.grid.Grid,{
    windows: {}

    ,getMenu: function() {
        var m = [];
        m.push({
            text: _('seosuite.url.update')
            ,handler: this.updateUrl
        });
        m.push({
            text: _('seosuite.url.find_suggestions')
            ,handler: this.findSuggestions
        });
        m.push('-');
        m.push({
            text: _('seosuite.url.remove')
            ,handler: this.removeUrl
        });
        this.addContextMenuItem(m);
    }

    ,updateUrl: function(btn,e,isUpdate) {
        if (!this.menu.record || !this.menu.record.id) return false;

        var updateUrl = MODx.load({
            xtype: 'seosuite-window-url'
            ,title: _('seosuite.url.update')
            ,action: 'mgr/url/update'
            ,record: this.menu.record
            ,listeners: {
                'success': {fn:function() { this.refresh(); },scope:this}
            }
        });

        updateUrl.fp.getForm().reset();
        updateUrl.fp.getForm().setValues(this.menu.record);
        updateUrl.show(e.target);
    }
    
    ,removeUrl: function(btn,e) {
        if (!this.menu.record) return false;
        
        MODx.msg.confirm({
            title: _('seosuite.url.remove')
            ,text: _('seosuite.url.remove_confirm')
            ,url: this.config.url
            ,params: {
                action: 'mgr/url/remove'
                ,id: this.menu.record.id
            }
            ,listeners: {
                'success': {fn:function(r) { this.refresh(); },scope:this}
            }
        });
    }

    ,findSuggestions: function(btn,e) {
        if (!this.menu.record) return false;
        
        MODx.Ajax.request({
            url: SeoSuite.config.connector_url
            ,params: {
                action: 'mgr/url/find_suggestions'
                ,id: this.menu.record.id
                ,url: this.menu.record.url
            }
            ,listeners: {
                'success': {fn:function(r) {
                    var result = r.object.suggestions;
                    if (result == ""){
                        Ext.Msg.alert(_('seosuite.url.find_suggestions'), _('seosuite.url.notfound_suggestions'));
                    } else {
                        Ext.Msg.alert(_('seosuite.url.find_suggestions'), _('seosuite.url.found_suggestions'));
                    }
                    this.refresh();
                }, scope: this }
            }
        });
    }

    ,filter: function (tf, nv, ov) {
        var store = this.getStore();
        var key = tf.getName();
        var value = tf.getValue();
        store.baseParams[key] = value;
        this.getBottomToolbar().changePage(1);
        this.refresh();
    }

    ,clearFilter: function (btn, e) {
        var baseParams = this.getStore().baseParams;
        delete baseParams.query;
        delete baseParams.solved;
        this.getStore().baseParams = baseParams;
        Ext.getCmp(this.config.id + '-search-field').setValue('');
        Ext.getCmp(this.config.id + '-solved-field').setValue('');
        this.getBottomToolbar().changePage(1);
        this.refresh();
    }

    ,renderBoolean: function (value, props, row) {
        return value
            ? String.format('<span class="green"><i class="icon icon-check"></i>&nbsp;&nbsp;{0}</span>', _('yes'))
            : String.format('<span class="red"><i class="icon icon-ban"></i>&nbsp;&nbsp;{0}</span>', _('no'));
    }
    
});
Ext.reg('seosuite-grid-urls',SeoSuite.grid.Urls);

SeoSuite.window.Url = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        title: _('seosuite.url.create')
        ,closeAction: 'close'
        ,url: SeoSuite.config.connectorUrl
        ,action: 'mgr/url/create'
        ,height: 300
        ,fields: [{
            xtype: 'textfield'
            ,name: 'id'
            ,hidden: true
        },{
            xtype: 'textfield'
            ,fieldLabel: _('seosuite.url.url')
            ,name: 'url'
            ,anchor: '100%'
        },{
            xtype: 'modx-combo'
            ,id: 'cmb_redirect_to'
            ,fieldLabel: _('seosuite.url.redirect_to')
            ,name: "redirect_to"
            ,hiddenName: "redirect_to"
            ,url: SeoSuite.config.connectorUrl
            ,fields: [{
                name: 'id',
                type: 'string'
            }, {
                name: 'pagetitle',
                type: 'string'
            }]
            ,displayField: 'pagetitle'
            ,baseParams: {
                action: 'mgr/resource/getlist'
                ,limit: 20
                ,sort: 'pagetitle'
                ,dir: 'asc'
            }
            ,typeAhead: true
            ,editable: true
            ,forceSelection: true
            ,emptyText: _('resource')
            ,anchor: '100%'
            ,allowBlank: true
            ,paging: true
            ,pageSize: 20
        }]
    });
    SeoSuite.window.Url.superclass.constructor.call(this,config);

    /* Dirty fix to set the combobox value to empty, when value from request = 0 */
    var cmb_redirect = Ext.getCmp('cmb_redirect_to');
    var redirect_to = cmb_redirect.getValue();
    if (!redirect_to) {
        cmb_redirect.setValue('');
    }
};
Ext.extend(SeoSuite.window.Url,MODx.Window);
Ext.reg('seosuite-window-url',SeoSuite.window.Url);

SeoSuite.window.Import = function(config) {
    config = config || {};
    var fieldWidth = 450;
    this.ident = config.ident || 'site-mecitem'+Ext.id();
    Ext.applyIf(config,{
        id: this.ident,
        autoHeight: true,
        width: fieldWidth+30,
        modal: true,
        closeAction: 'close',
        url: SeoSuite.config.connector_url,
        baseParams: {
            action: 'mgr/url/import',
            register: 'mgr',
            topic: '/seosuiteimport/'
        },
        fileUpload: true,
        fields: [{
            html: '<p>'+_('seosuite.import.instructions')+'</p>',
            style: 'paddingTop: 20px'
        },
        {
            xtype: 'textfield',
            fieldLabel: _('seosuite.url.file'),
            buttonText: _('seosuite.url.import_choose'),
            name: 'file',
            inputType: 'file'
        }]
    });
    SeoSuite.window.Import.superclass.constructor.call(this,config);
};
Ext.extend(SeoSuite.window.Import,MODx.Window);
Ext.reg('seosuite-window-import',SeoSuite.window.Import);
