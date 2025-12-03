import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { MODAL_TYPE } from 'panel/helpers/constants';
import { RootState } from 'panel/initialState';
import theme from 'panel/lib/theme';
import { getRewritesList, updateRewrite } from 'panel/actions/rewrites';
import { Icon } from 'panel/common/ui/Icon';
import { openModal } from 'panel/reducers/modals';
import { DeleteRewriteModal } from 'panel/components/FilterLists/blocks/DeleteRewriteModal';
import { ConfigureRewritesModal } from 'panel/components/FilterLists/blocks/ConfigureRewritesModal/ConfigureRewritesModal';
import { RewritesTable } from './blocks/RewritesTable/RewritesTable';
import { FilterUpdateModal } from './blocks/FilterUpdateModal';

import s from './FilterLists.module.pcss';
import { Rewrite } from 'panel/helpers/helpers';

export const DNSRewrites = () => {
    const dispatch = useDispatch();
    const { rewrites } = useSelector((state: RootState) => state);
    const [currentRewrite, setCurrentRewrite] = useState<{ answer: string; domain: string; enabled: boolean }>({
        answer: '',
        domain: '',
        enabled: false,
    });

    const { list, processing, processingAdd, processingUpdate, processingDelete } = rewrites;

    useEffect(() => {
        dispatch(getRewritesList());
    }, [dispatch]);

    const openAddRewiresModal = () => {
        dispatch(openModal(MODAL_TYPE.ADD_REWRITE));
    };

    const openAddBlocklistModal = () => {
        dispatch(openModal(MODAL_TYPE.ADD_BLOCKLIST));
    };

    const openEditRewriteModal = (answer: string, domain: string, enabled: boolean) => {
        setCurrentRewrite({ answer, domain, enabled });
        dispatch(openModal(MODAL_TYPE.EDIT_REWRITE));
    };

    const openDeleteRewriteModal = (answer: string, domain: string, enabled: boolean) => {
        setCurrentRewrite({ answer, domain, enabled });
        dispatch(openModal(MODAL_TYPE.DELETE_REWRITE));
    };

    const toggleRewrite = (rewrite: Rewrite) => {
        const { enabled } = rewrite;

        rewrite.enabled = !enabled;

        dispatch(updateRewrite(rewrite));
    };

    return (
        <div className={theme.layout.container}>
            <div className={theme.layout.containerIn}>
                <h1 className={cn(theme.layout.title, theme.title.h4, theme.title.h3_tablet)}>
                    {intl.getMessage('dns_rewrites')}
                </h1>

                <div className={s.desc}>{intl.getMessage('dns_rewrites_desc')}</div>

                <div className={s.group}>
                    <button type="button" className={cn(s.button, s.button_add)} onClick={openAddRewiresModal}>
                        <Icon icon="plus" color="green" />
                        {intl.getMessage('rewrite_add')}
                    </button>
                </div>

                <div className={cn(s.group, s.stretchSelf)}>
                    <RewritesTable
                        list={list}
                        processing={processing}
                        processingAdd={processingAdd}
                        processingUpdate={processingUpdate}
                        processingDelete={processingDelete}
                        addRewritesList={openAddRewiresModal}
                        deleteRewrite={openDeleteRewriteModal}
                        editRewrite={openEditRewriteModal}
                        toggleRewrite={toggleRewrite}
                    />
                </div>

                <ConfigureRewritesModal modalId={MODAL_TYPE.ADD_REWRITE} />

                <ConfigureRewritesModal modalId={MODAL_TYPE.EDIT_REWRITE} rewriteToEdit={currentRewrite} />

                <DeleteRewriteModal rewriteToDelete={currentRewrite} setRewriteToDelete={setCurrentRewrite} />
            </div>
        </div>
    );
};
